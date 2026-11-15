import { defineBoot } from '@quasar/app-vite/wrappers';
import { usePanePersistence } from 'src/composables/pane-persistence';

export default defineBoot(async () => {
  const { start } = usePanePersistence();
  await start();
});
