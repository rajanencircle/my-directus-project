import { defineModule } from '@directus/extensions-sdk';
import AccessGate from './routes/AccessGate.vue';
import ImageViewer from './routes/ImageViewer.vue';
import ShareError from './routes/ShareError.vue';

export default defineModule({
  id: 'media-share-viewer',
  name: 'Media Share Viewer',
  icon: 'lock',
  hidden: true,
  routes: [
    {
      path: ':shareId',
      component: AccessGate,
    },
    {
      path: ':shareId/view',
      component: ImageViewer,
    },
    {
      path: 'error/:reason',
      component: ShareError,
    },
  ],
});
