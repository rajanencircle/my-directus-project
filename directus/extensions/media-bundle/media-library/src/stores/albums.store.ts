import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@directus/extensions-sdk'

export interface DirectusAlbum {
  id: string
  name: string
}

export const useAlbumsStore = defineStore('media-library-albums', () => {
  const api = useApi()

  const albums = ref<DirectusAlbum[]>([])
  const selectedAlbumId = ref<string | null>(null)
  const isLoading = ref(false)

  async function fetchAlbums() {
    isLoading.value = true
    try {
      const res = await api.get('/items/albums_directus', {
        params: {
          fields: ['id', 'name'],
          filter: { status: { _neq: 'archived' } },
          sort: ['sort', 'name'],
          limit: -1,
        },
      })
      albums.value = res.data?.data ?? []
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

  async function deleteAlbum(id: string): Promise<void> {
    try {
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

  return { albums, selectedAlbumId, isLoading, fetchAlbums, selectAlbum, createAlbum, deleteAlbum }
})
