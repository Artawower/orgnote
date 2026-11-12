import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import {
  SKIP_WAITING_MESSAGE,
  CACHE_MAX_ENTRIES,
  CACHE_MAX_AGE_SECONDS,
  NAVIGATION_NETWORK_TIMEOUT_MS,
  STATIC_RESOURCES_CACHE_NAME,
} from './constants';

declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & { skipWaiting: () => void };

self.addEventListener('message', (event) => {
  if (event.data?.type === SKIP_WAITING_MESSAGE) {
    self.skipWaiting();
  }
});

clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

cleanupOutdatedCaches();

const isStaticAsset = ({ request }: { request: Request }) =>
  request.method === 'GET' &&
  (request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font');

registerRoute(
  isStaticAsset,
  new StaleWhileRevalidate({
    cacheName: STATIC_RESOURCES_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: CACHE_MAX_ENTRIES,
        maxAgeSeconds: CACHE_MAX_AGE_SECONDS,
      }),
    ],
  })
);

if (process.env.PROD) {
  const getFallbackHtml = (): Promise<Response | undefined> =>
    matchPrecache(process.env.PWA_FALLBACK_HTML);

  const createNavigationRequest = (request: Request, signal: AbortSignal): Request =>
    new Request(request, { cache: 'reload', signal });

  const fetchCurrentNavigation = (request: Request): Promise<Response | undefined> =>
    new Promise((resolve) => {
      const controller = new AbortController();
      let isSettled = false;

      const settleNavigationResponse = (response: Response | undefined): void => {
        if (isSettled) return;
        isSettled = true;
        self.clearTimeout(timeoutId);
        resolve(response);
      };

      const timeoutId = self.setTimeout(() => {
        controller.abort();
        settleNavigationResponse(undefined);
      }, NAVIGATION_NETWORK_TIMEOUT_MS);

      fetch(createNavigationRequest(request, controller.signal)).then(
        settleNavigationResponse,
        () => settleNavigationResponse(undefined)
      );
    });

  const buildOfflineNavigationResponse = (): Response =>
    new Response('<!doctype html><title>Offline</title><h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  const handleNavigation = async ({ request }: { request: Request }): Promise<Response> => {
    const networkResponse = await fetchCurrentNavigation(request);
    if (networkResponse?.ok) return networkResponse;
    const fallbackResponse = await getFallbackHtml();
    return fallbackResponse ?? networkResponse ?? buildOfflineNavigationResponse();
  };

  registerRoute(
    new NavigationRoute(handleNavigation, {
      denylist: [
        /index\.html$/,
        /api\/(.)*/,
        /v1\/(.)*/,
        /builds\/(.)*/,
        /media\/(.)*/,
        new RegExp(process.env.PWA_SERVICE_WORKER_REGEX),
        /workbox-(.)*\.js$/,
      ],
    })
  );
}
