import { defineModule } from '@directus/extensions-sdk'
import MediaLibraryView from './views/MediaLibraryView.vue'
import FileDetailView from './views/FileDetailView.vue'

export default defineModule({
  id: 'media-library',
  name: 'Media Library',
  icon: 'photo_library',
  routes: [
    {
      path: '',
      component: MediaLibraryView,
    },
    {
      path: ':id',
      component: FileDetailView,
      props: true,
    },
  ],
})
