import { boot } from 'quasar/wrappers';
import 'highlight.js/styles/atom-one-dark.css';
import hljsVuePlugin from '@highlightjs/vue-plugin';
import hljsCommon from 'highlight.js/lib/common';

export default boot(({ app }) => {
  // NOTE: https://github.com/highlightjs/vue-plugin/issues/44#issuecomment-1594686145
  const _warmup = hljsCommon.highlightAuto(
    '<h1>Highlight.js has been registered successfully!</h1>',
  ).value;
  void _warmup;
  app.use(hljsVuePlugin);
});
