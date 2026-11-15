import type { Modal, ModalConfig, ModalStore, VueComponent } from 'orgnote-api';
import { defineStore } from 'pinia';
import { createPromise } from 'src/utils/create-promise';
import { computed, shallowRef } from 'vue';

export const useModalStore = defineStore<'modal', ModalStore>('modal', () => {
  const modals = shallowRef<Modal[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvers: Array<(value?: any) => any> = [];
  let nextModalId = 0;

  const open = <TReturn = unknown>(
    cmp: VueComponent,
    modalConfig: ModalConfig = { closable: true },
  ): Promise<TReturn> => {
    const alreadyOpenedIndex = modals.value.findIndex((c) => c.component === cmp);

    if (alreadyOpenedIndex !== -1) {
      modals.value = modals.value.slice(0, alreadyOpenedIndex + 1);
      return modals.value[alreadyOpenedIndex]!.closed as Promise<TReturn>;
    }

    const [p, resolver] = createPromise<TReturn>();
    resolvers.push(resolver);

    modals.value = [
      ...modals.value,
      {
        id: ++nextModalId,
        component: cmp,
        closed: p,
        config: modalConfig,
      },
    ];

    return p;
  };

  const close = <TReturn = unknown>(data?: TReturn) => {
    if (!modals.value.length) {
      return;
    }
    modals.value = modals.value.slice(0, modals.value.length - 1);
    resolvers.pop()?.(data);
  };

  const config = computed(() => modals.value[modals.value.length - 1]?.config);

  const component = computed(() => modals.value[modals.value.length - 1]?.component);

  const title = computed(() => config.value?.title);

  const closeAll = () => {
    resolvers.forEach((resolve) => resolve(undefined));
    resolvers.length = 0;
    modals.value = [];
  };

  const updateConfig = (newConfig: Partial<ModalConfig>) => {
    const lastModal = modals.value[modals.value.length - 1];
    if (!lastModal) return;

    modals.value = [
      ...modals.value.slice(0, -1),
      {
        ...lastModal,
        config: {
          ...lastModal.config,
          ...newConfig,
        },
      },
    ];
  };

  const store: ModalStore = {
    open,
    title,
    close,
    modals,
    component,
    config,
    closeAll,
    updateConfig,
  };

  return store;
});
