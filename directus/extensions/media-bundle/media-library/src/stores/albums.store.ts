import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import { partnerAlbumOrFilter, usePartnerScope } from '../composables/usePartnerScope'

export interface DirectusAlbum {
  id: string
  name: string
}

export const useAlbumsStore = defineStore('media-library-albums', () => {
  const api = useApi()
  const { partnerScopeIds, currentUserId, isPartnerScoped, init: initPartnerScope } = usePartnerScope()

  const albums = ref<DirectusAlbum[]>([])
  const selectedAlbumId = ref<string | null>(null)
  const isLoading = ref(false)
  const loadedForUserId = ref<string | null>(null)

  async function fetchAlbums(opts?: { force?: boolean }) {
    await initPartnerScope()
    const uid = currentUserId.value ?? '__none__'
    if (!opts?.force && loadedForUserId.value === uid) return

    isLoading.value = true
    try {
      if (loadedForUserId.value && loadedForUserId.value !== uid) {
        albums.value = []
      }
      const statusFilter = { status: { _neq: 'archived' } }
      const filter = isPartnerScoped.value && (partnerScopeIds.value?.length ?? 0) > 0
        ? { _and: [statusFilter, partnerAlbumOrFilter(partnerScopeIds.value ?? [])] }
        : statusFilter
      const res = await api.get('/items/albums_directus', {
        params: {
          fields: ['id', 'name'],
          filter,
          sort: ['sort', 'name'],
          limit: -1,
        },
      })
      albums.value = res.data?.data ?? []
      loadedForUserId.value = uid
    } catch (err) {
      console.warn('[media-library] Failed to fetch albums:', err)
    } finally {
      isLoading.value = false
    }
  }

  function selectAlbum(id: string | null) {
    selectedAlbumId.value = id
  }

  async function createAlbum(name: string): Promise<DirectusAlbum> {
    const res = await api.post('/items/albums_directus', { name, status: 'published' })
    const created: DirectusAlbum = res.data?.data
    albums.value = [...albums.value, created]
    return created
  }

  async function renameAlbum(id: string, name: string): Promise<void> {
    const res = await api.patch(`/items/albums_directus/${id}`, { name })
    const updated: DirectusAlbum = res.data?.data
    albums.value = albums.value.map((a) =>
      a.id === id ? { ...a, name: updated?.name ?? name } : a,
    )
  }

  async function deleteAlbum(id: string): Promise<void> {
    try {
      // Remove junction rows first so file detail never shows "(Unknown album)"
      try {
        const res = await api.get('/items/albums_directus_files', {
          params: {
            filter: { albums_directus_id: { _eq: id } },
            fields: ['id'],
            limit: -1,
          },
        })
        const rows: Array<{ id: number | string }> = res.data?.data ?? []
        await Promise.allSettled(
          rows.map((r) => api.delete(`/items/albums_directus_files/${r.id}`)),
        )
      } catch (err) {
        console.warn('[media-library] Failed to clear album file links:', err)
      }

      await api.delete(`/items/albums_directus/${id}`)
      albums.value = albums.value.filter((a) => a.id !== id)
      if (selectedAlbumId.value === id) {
        selectedAlbumId.value = null
      }
    } catch (err) {
      console.warn('[media-library] Failed to delete album:', err)
      throw err
    }
  }

  return {
    albums,
    selectedAlbumId,
    isLoading,
    fetchAlbums,
    selectAlbum,
    createAlbum,
    renameAlbum,
    deleteAlbum,
  }
})
