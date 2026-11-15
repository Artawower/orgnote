import { ref, shallowRef } from 'vue';
import type { ComponentConfig, VueComponent } from 'orgnote-api';

export const usePanelState = () => {
  const opened = ref(false);
  const component = shallowRef<VueComponent>();
  const componentConfig = shallowRef<ComponentConfig<VueComponent>>();

  const open = () => {
    opened.value = true;
  };

  const close = () => {
    opened.value = false;
  };

  const toggle = () => {
    opened.value = !opened.value;
  };

  const setComponent = <T extends VueComponent>(cmp: T, config?: ComponentConfig<T>) => {
    componentConfig.value = config;
    component.value = cmp;
  };

  const openComponent = <T extends VueComponent>(cmp: T, config?: ComponentConfig<T>) => {
    if (opened.value && component.value === cmp) {
      close();
      return;
    }
    setComponent(cmp, config);
    open();
  };

  return {
    opened,
    component,
    componentConfig,
    open,
    close,
    toggle,
    setComponent,
    openComponent,
  };
};
