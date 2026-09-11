import { useApi, useStores } from '@directus/extensions-sdk'

type ApiClient = {
  get: (url: string, config?: Record<string, unknown>) => Promise<{ data: any }>
}

let started = false
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

async function refreshUnread(notificationsStore: any) {
  try {
    if (typeof notificationsStore.refreshUnreadCount === 'function') {
      await notificationsStore.refreshUnreadCount()
    } else if (typeof notificationsStore.hydrate === 'function') {
      await notificationsStore.hydrate()
    }
  } catch (err) {
    console.warn('[media-library] Failed to refresh notification badge:', err)
  }
}

/** Debounce bursty WS events into one unread refresh. */
function scheduleRefresh(notificationsStore: any) {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void refreshUnread(notificationsStore)
  }, 250)
}

async function getAccessToken(api: ApiClient): Promise<string | null> {
  try {
    const resp = await api.get('/ws-token')
    return resp.data?.token ?? null
  } catch {
    return null
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  if (ws) {
    try {
      ws.close(1000, 'stop')
    } catch { /* ignore */ }
    ws = null
  }
}

async function connect(
  api: ApiClient,
  userId: string,
  notificationsStore: any,
) {
  disconnect()

  const token = await getAccessToken(api)
  if (!token || !userId) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  ws = new WebSocket(`${protocol}//${host}/websocket?access_token=${token}`)

  ws.onopen = () => {
    ws?.send(JSON.stringify({
      type: 'subscribe',
      collection: 'directus_notifications',
      query: {
        filter: { recipient: { _eq: userId } },
        fields: ['id', 'status'],
      },
    }))
  }

  ws.onmessage = (event) => {
    let msg: any
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }
    if (msg.type !== 'subscription') return
    if (msg.event === 'create' || msg.event === 'update' || msg.event === 'delete') {
      scheduleRefresh(notificationsStore)
    }
  }

  ws.onclose = (event) => {
    ws = null
    if (!started) return
    if (event.code !== 1000) {
      reconnectTimer = setTimeout(() => {
        void connect(api, userId, notificationsStore)
      }, 5000)
    }
  }

  ws.onerror = () => {
    console.warn('[media-library] Notification badge WebSocket error')
  }
}

/**
 * Keep Directus notification bell unread count in sync while working in media library.
 * Singleton — safe to call from multiple views; only one WS connection is used.
 */
export function useNotificationBadgeSync() {
  const api = useApi() as ApiClient
  const { useNotificationsStore, useUserStore } = useStores()
  const notificationsStore = useNotificationsStore()
  const userStore = useUserStore()

  function start() {
    if (started) return
    const userId = userStore.currentUser?.id
    if (!userId) return

    started = true
    void connect(api, userId, notificationsStore)
    // Align badge immediately on enter
    void refreshUnread(notificationsStore)
  }

  function stop() {
    // Keep singleton alive for the session across media routes — no-op stop.
    // Call forceStop() only if a full teardown is ever needed.
  }

  function forceStop() {
    started = false
    disconnect()
  }

  return { start, stop, forceStop }
}
