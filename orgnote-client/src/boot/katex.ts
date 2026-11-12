import Vue3Katex from '@hsorby/vue3-katex';
import { defineBoot } from '@quasar/app-vite/wrappers';

export default defineBoot(({ app }) => {
  app.use(Vue3Katex, {
    globalOptions: {
      throwOnError: false,
    },
  });
});
