import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';
import { GRAPH_BUFFER_PATTERN } from 'src/constants/graph-buffer';

export default defineBoot(() => {
  const bufferViewer = api.core.useBufferViewer();

  bufferViewer.register({
    pattern: GRAPH_BUFFER_PATTERN,
    component: () => import('src/containers/GraphContainer.vue'),
    meta: {
      id: 'builtin:graph-viewer',
      name: 'Graph Viewer',
      icon: 'hub',
      priority: 100,
    },
  });

  bufferViewer.register({
    pattern: '\\.org(\\.gpg)?$',
    component: () => import('src/readers/OrgEditor.vue'),
    meta: {
      id: 'builtin:org-rich-editor',
      name: 'Org Editor (Rich)',
      icon: 'edit_note',
      priority: 20,
      viewState: { version: 1 },
    },
  });

  bufferViewer.register({
    pattern: '\\.org(\\.gpg)?$',
    component: () => import('src/readers/OrgTextEditor.vue'),
    meta: {
      id: 'builtin:org-text-editor',
      name: 'Org Editor (Text)',
      icon: 'description',
      priority: 10,
    },
  });

  bufferViewer.register({
    pattern: '\\.(ts|js|jsx|tsx|json|toml|yaml|yml)$',
    component: () => import('src/readers/CodeEditor.vue'),
    meta: {
      id: 'builtin:code-editor',
      name: 'Code Editor',
      icon: 'code',
      priority: 10,
      viewState: { version: 1 },
    },
  });

  bufferViewer.register({
    pattern: '\\.(png|jpg|jpeg|gif|webp|svg)$',
    component: () => import('src/readers/ImageViewer.vue'),
    meta: {
      id: 'builtin:image-viewer',
      name: 'Image Viewer',
      icon: 'image',
      priority: 10,
    },
  });

  bufferViewer.register({
    pattern: '.*',
    component: () => import('src/readers/CodeEditor.vue'),
    meta: {
      id: 'builtin:text-editor',
      name: 'Text Editor',
      icon: 'article',
      priority: 0,
      viewState: { version: 1 },
    },
  });
});
