import { defineBoot } from '@quasar/app-vite/wrappers';
import { useFileIndexing } from 'src/composables/use-file-indexing';

export default defineBoot(({ store }) => {
  useFileIndexing(store);
});
