import { defineModule } from '@directus/extensions-sdk'
import MediaLibraryView from './views/MediaLibraryView.vue'
import FileDetailView from './views/FileDetailView.vue'

export default defineModule({
  id: 'media-library',
  name: 'Media Library',
  icon: 'photo_library',
  routes: [
    {
      // All files (no folder filter)
      path: '',
      component: MediaLibraryView,
    },
    {
      // Folder view — like native /admin/files/folders/:folderId
      path: 'folders/:folderId',
      component: MediaLibraryView,
      props: true,
    },
    {
      // Album view
      path: 'albums/:albumId',
      component: MediaLibraryView,
      props: true,
    },
    {
      // File detail — keep /media-library/:id for existing links/notifications
      path: ':id',
      component: FileDetailView,
      props: true,
    },
  ],
})
