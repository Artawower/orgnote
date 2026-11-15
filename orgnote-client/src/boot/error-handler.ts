import { defineBoot } from '@quasar/app-vite/wrappers';
import { reporter } from './report';
import type { Router } from 'vue-router';
import type { ComponentPublicInstance } from 'vue';
import { RouteNames, isPresent } from 'orgnote-api';
import { hasWindow } from 'src/utils/platform-specific';

const extractComponentChain = (instance: ComponentPublicInstance | null): string[] => {
  const chain: string[] = [];
  let current = instance;
  while (current) {
    const name = current.$.type?.name ?? current.$.type?.__name ?? 'Anonymous';
    chain.push(name);
    current = current.$.parent?.proxy ?? null;
  }
  return chain;
};

const wrapError = (error: unknown, source: string): Error => {
  if (error instanceof Error) {
    return error;
  }

  const message = isPresent(error) ? String(error) : `Unknown error from ${source}`;
  return new Error(message, { cause: error });
};

const RESOURCE_TAGS = new Set(['IMG', 'SCRIPT', 'LINK', 'AUDIO', 'VIDEO', 'SOURCE']);

const isResourceLoadError = (meta: Record<string, unknown>): boolean =>
  typeof meta.targetTag === 'string' && RESOURCE_TAGS.has(meta.targetTag);

const handleError = (
  error: unknown,
  meta: Record<string, unknown>,
  router: Router,
  source: string,
): void => {
  const wrappedError = wrapError(error, source);

  const errorInfo: Record<string, unknown> = {
    ...meta,
    source,
    originalErrorType: error?.constructor?.name ?? typeof error,
    stack: wrappedError.stack,
  };

  if (!(error instanceof Error) && isPresent(error)) {
    errorInfo.originalValue = String(error);
  }

  if (isResourceLoadError(meta)) {
    reporter.reportWarning(wrappedError, {
      message: `Failed to load resource: ${meta.targetTag}`,
    });
    return;
  }

  reporter.reportCritical(wrappedError, errorInfo);

  router.push({ name: RouteNames.Error }).catch(() => {
    throw wrappedError;
  });
};

export default defineBoot(({ app, router, ssrContext }) => {
  if (!ssrContext && hasWindow()) {
    window.addEventListener(
      'error',
      (event) => {
        event.stopImmediatePropagation();

        const meta: Record<string, unknown> = {};
        if (event.filename) meta.url = event.filename;
        if (event.lineno) meta.line = event.lineno;
        if (event.colno) meta.col = event.colno;
        if (event.message) meta.eventMessage = event.message;
        if (event.target && event.target !== window) {
          const target = event.target as HTMLElement;
          meta.targetTag = target.tagName;
          if (target.tagName === 'IMG')
            meta.imgSrc = (target as HTMLImageElement).src?.slice(0, 200);
          if (target.tagName === 'SCRIPT') meta.scriptSrc = (target as HTMLScriptElement).src;
          if (target.tagName === 'LINK') meta.linkHref = (target as HTMLLinkElement).href;
        }

        handleError(event.error, meta, router, 'window.onerror');
      },
      { capture: true },
    );

    window.addEventListener(
      'unhandledrejection',
      (event) => {
        event.stopImmediatePropagation();

        handleError(event.reason, {}, router, 'unhandledrejection');
      },
      { capture: true },
    );
  }

  app.config.errorHandler = (err, instance, info): void => {
    const componentChain = extractComponentChain(instance);

    handleError(
      err,
      {
        vueInfo: info,
        component: componentChain[0],
        componentChain,
      },
      router,
      'Vue.errorHandler',
    );
  };

  router.onError((error) => {
    handleError(error, {}, router, 'Router.onError');
  });
});
