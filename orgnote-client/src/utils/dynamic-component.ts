import type { Component, VNode, App } from 'vue';
import { createApp, defineComponent, isVNode, getCurrentInstance } from 'vue';
import { to } from 'orgnote-api/utils';
import { logger } from 'src/boot/logger';

export interface DynamicComponentInstance {
  destroy: () => void;
  refresh: (...args: unknown[]) => void;
}

const noopInstance: DynamicComponentInstance = {
  destroy: () => {},
  refresh: () => {},
};

export const useDynamicComponent = () => {
  const vueInstance = getCurrentInstance();

  const mount = (
    cmp: Component | VNode,
    wrap: Element,
    props?: Record<string, unknown>,
  ): DynamicComponentInstance => {
    let app: App | null = null;
    let destroyed = false;

    const componentToMount = isVNode(cmp) ? defineComponent({ render: () => cmp }) : cmp;
    app = createApp(componentToMount, isVNode(cmp) ? undefined : props);

    if (vueInstance?.appContext) {
      Object.assign(app._context, vueInstance.appContext);
    }

    app.config.errorHandler = (err, _instance, info) => {
      if (destroyed) return;
      logger.error('[Widget Runtime Error]', {
        info,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    };

    app.config.warnHandler = (msg, _instance, trace) => {
      if (destroyed) return;
      logger.warn(`[Widget Runtime Warn] ${msg}`, { msg, trace });
    };

    const [err] = to(() => app!.mount(wrap))();
    if (err) {
      logger.error('[Widget Mount Error]', {
        message: err instanceof Error ? err.message : String(err),
      });
      return noopInstance;
    }

    return {
      destroy: () => {
        if (!app || destroyed) return;
        destroyed = true;
        to(() => app!.unmount())();
        app = null;
      },
      refresh: (...args: unknown[]) => {
        if (destroyed) return;
        const exposed = app?._instance?.exposed as { refresh?: (...args: unknown[]) => void };
        exposed?.refresh?.(...args);
      },
    };
  };

  return { mount };
};
