import { RouteNames } from 'orgnote-api';
import type { Router, RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { createMemoryHistory, createRouter } from 'vue-router';

const DEFAULT_TAB_TITLE = 'Untitled';

const fileNameTitleGenerator = (route: RouteLocationNormalized): string => {
  const filePath = route.params.path as string;
  if (!filePath) return '';

  const fileName = filePath.split('/').pop();
  return fileName || DEFAULT_TAB_TITLE;
};

interface EditorRouteConfig {
  basePath: string;
  parentName: string;
  childName: string;
  component: () => Promise<unknown>;
}

const createBufferRoute = (config: EditorRouteConfig): RouteRecordRaw => ({
  path: `/:tabId/${config.basePath}`,
  name: config.parentName,
  component: () => import('src/pages/AppBuffer.vue'),
  children: [
    {
      path: ':path(.*)',
      name: config.childName,
      component: config.component,
      meta: {
        titleGenerator: fileNameTitleGenerator,
      },
    },
  ],
});

export const createPaneRouter = async (tabId: string): Promise<Router> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:tabId',
        name: RouteNames.InitialPage,
        component: () => import('src/pages/InitialPage.vue'),
        meta: {
          titleGenerator: () => '',
        },
      },
      createBufferRoute({
        basePath: 'file',
        parentName: 'OpenFileReader',
        childName: RouteNames.File,
        component: () => import('src/pages/FilePage.vue'),
      }),
      createBufferRoute({
        basePath: 'remote',
        parentName: 'OpenRemoteReader',
        childName: RouteNames.Remote,
        component: () => import('src/pages/FilePage.vue'),
      }),
      createBufferRoute({
        basePath: 'embedded',
        parentName: 'OpenEmbeddedReader',
        childName: RouteNames.Embedded,
        component: () => import('src/pages/FilePage.vue'),
      }),
      createBufferRoute({
        basePath: 'builtin',
        parentName: 'OpenBuiltinReader',
        childName: RouteNames.Builtin,
        component: () => import('src/pages/FilePage.vue'),
      }),
    ],
  });

  await router.push({ name: RouteNames.InitialPage, params: { tabId } });
  return router;
};
