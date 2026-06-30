<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import SidebarDetail from './SidebarDetail.vue'

const props = defineProps<{ fileId: string }>()

const api = useApi()
const PAGE_SIZE = 10

interface ActivityUser {
  id?: string
  first_name?: string | null
  last_name?: string | null
}

interface Activity {
  action: string
  timestamp: string
  user?: ActivityUser | string | null
}

interface Revision {
  id: number
  delta: Record<string, any> | null
  activity: Activity
}

interface RevisionGroup {
  date: Date
  dateFormatted: string
  revisions: Revision[]
}

const revisions = ref<Revision[] | null>(null)
const revisionsCount = ref(0)
const loadingCount = ref(false)
const loading = ref(false)
const page = ref(1)
const pagesCount = ref(0)
const hasLoaded = ref(false)

const badge = computed(() => {
  if (loadingCount.value || revisionsCount.value === 0) return undefined
  return revisionsCount.value > 999
    ? `${Math.floor(revisionsCount.value / 1000)}k`
    : String(revisionsCount.value)
})

const groupedRevisions = computed<RevisionGroup[]>(() => {
  if (!revisions.value) return []
  const map = new Map<string, RevisionGroup>()
  for (const rev of revisions.value) {
    const dateKey = new Date(new Date(rev.activity.timestamp).toDateString()).toISOString()
    if (!map.has(dateKey)) {
      const d = new Date(dateKey)
      map.set(dateKey, { date: d, dateFormatted: formatGroupDate(d), revisions: [] })
    }
    map.get(dateKey)!.revisions.push(rev)
  }
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime())
})

function formatGroupDate(d: Date): string {
  const now = new Date()
  const today = new Date(now.toDateString())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  const thisYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString(undefined, thisYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' })
}

function getActionLabel(action: string, delta: Record<string, any> | null): string {
  const count = Object.keys(delta ?? {}).length
  switch (action.toLowerCase()) {
    case 'create': return 'Created'
    case 'update': return count === 1 ? 'Updated 1 field' : `Updated ${count} fields`
    case 'delete': return 'Deleted'
    case 'version_save': return count === 1 ? 'Updated 1 field' : `Updated ${count} fields`
    case 'revert': return 'Reverted'
    default: return 'Changed'
  }
}

function getUserName(activity: Activity): string {
  const u = activity.user
  if (!u) return 'Unknown'
  if (typeof u === 'string') return 'Unknown'
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown'
}

function getTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

async function loadCount() {
  loadingCount.value = true
  try {
    const res = await api.get('/revisions', {
      params: {
        filter: {
          _and: [
            { collection: { _eq: 'directus_files' } },
            { item: { _eq: props.fileId } },
            { version: { _null: true } },
          ],
        },
        aggregate: { count: 'id' },
      },
    })
    revisionsCount.value = Number(res.data?.data?.[0]?.count?.id ?? 0)
    pagesCount.value = Math.ceil(revisionsCount.value / PAGE_SIZE)
  } catch {
    revisionsCount.value = 0
  } finally {
    loadingCount.value = false
  }
}

async function loadRevisions(p = 1) {
  loading.value = true
  try {
    const res = await api.get('/revisions', {
      params: {
        filter: {
          _and: [
            { collection: { _eq: 'directus_files' } },
            { item: { _eq: props.fileId } },
            { version: { _null: true } },
          ],
        },
        sort: '-id',
        limit: PAGE_SIZE,
        page: p,
        fields: [
          'id',
          'delta',
          'activity.action',
          'activity.timestamp',
          'activity.user.id',
          'activity.user.first_name',
          'activity.user.last_name',
        ],
      },
    })
    revisions.value = res.data?.data ?? []
    hasLoaded.value = true
  } catch {
    revisions.value = []
  } finally {
    loading.value = false
  }
}

function onToggle(open: boolean) {
  if (open && !hasLoaded.value) loadRevisions(page.value)
}

async function reload() {
  page.value = 1
  hasLoaded.value = false
  revisions.value = null
  await loadCount()
}

onMounted(loadCount)
watch(() => props.fileId, reload)
watch(page, (p) => loadRevisions(p))
</script>

<template>
  <SidebarDetail icon="change_history" title="Revisions" :badge="badge" @toggle="onToggle">
    <v-progress-linear v-if="loading && !revisions" indeterminate />

    <div v-else-if="revisionsCount === 0" class="empty">
      <div class="content">No revisions</div>
    </div>

    <template v-else-if="revisions">
      <div v-for="group in groupedRevisions" :key="group.date.toISOString()" class="date-group">
        <v-detail :label="group.dateFormatted" start-open>
          <div class="scroll-container">
            <button
              v-for="(rev, index) in group.revisions"
              :key="rev.id"
              type="button"
              class="revision-item"
              :class="{ last: index === group.revisions.length - 1 }"
            >
              <div class="header">
                <span class="dot" :class="rev.activity.action" />
                {{ getActionLabel(rev.activity.action, rev.delta) }}
              </div>
              <div class="content">
                <span class="time">{{ getTime(rev.activity.timestamp) }}</span>
                –
                <span>{{ getUserName(rev.activity) }}</span>
              </div>
            </button>
          </div>
        </v-detail>
      </div>

      <v-pagination
        v-if="pagesCount > 1"
        v-model="page"
        :length="pagesCount"
        :total-visible="3"
        class="pagination"
      />
    </template>
  </SidebarDetail>
</template>

<style scoped>
.empty {
  margin-block: 0.875rem;
  margin-inline-start: 0.125rem;
  color: var(--theme--foreground-subdued);
  font-style: italic;
}

.date-group {
  margin-block-end: 0.25rem;
}

.scroll-container {
  padding-inline-start: 1rem;
}

.revision-item {
  position: relative;
  display: block;
  inline-size: 100%;
  margin-block-end: 0.6875rem;
  padding-inline-start: 0.875rem;
  text-align: start;
  background: none;
  border: none;
  cursor: default;
}

.revision-item .header {
  position: relative;
  z-index: 2;
  font-weight: 600;
  font-size: 0.875rem;
}

.revision-item .dot {
  position: absolute;
  inset-block-start: 0.3125rem;
  inset-inline-start: -1rem;
  z-index: 2;
  inline-size: 0.625rem;
  block-size: 0.625rem;
  background-color: var(--theme--warning);
  border: var(--theme--border-width) solid var(--theme--background-normal);
  border-radius: 0.4375rem;
}

.revision-item .dot.create,
.revision-item .dot.update,
.revision-item .dot.version_save {
  background-color: var(--theme--primary);
}

.revision-item .dot.delete {
  background-color: var(--theme--danger);
}

/* hover background pill */
.revision-item::before {
  position: absolute;
  inset-block-start: -0.25rem;
  inset-inline-start: 0.6875rem;
  z-index: 1;
  inline-size: calc(100% - 0.6875rem);
  block-size: calc(100% + 0.5625rem);
  background-color: var(--theme--background-accent);
  border-radius: var(--theme--border-radius);
  opacity: 0;
  transition: opacity var(--fast) var(--transition);
  content: '';
  pointer-events: none;
}

/* vertical connecting line */
.revision-item:not(.last)::after {
  position: absolute;
  inset-block-start: 0.6875rem;
  inset-inline-start: 0.1875rem;
  z-index: 1;
  inline-size: 0.0625rem;
  block-size: calc(100% + 0.6875rem);
  background-color: var(--theme--background-accent);
  content: '';
}

.revision-item:hover::before {
  opacity: 1;
  transition: none;
}

.revision-item + .revision-item {
  margin-block-start: 0.6875rem;
}

.revision-item .content {
  position: relative;
  z-index: 2;
  color: var(--theme--foreground-subdued);
  font-size: 0.8125rem;
  line-height: 0.875rem;
}

.revision-item .content .time {
  text-transform: lowercase;
  font-feature-settings: 'tnum';
}

.pagination {
  justify-content: center;
  margin-block-start: 1.375rem;
}
</style>
