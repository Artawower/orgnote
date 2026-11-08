import type { Ref, ShallowRef } from 'vue';
import { StoreDefinition } from './store';
import { VueComponent } from './vue-component';
import { Modal, ModalConfig } from './modal';
import { ComputedRef } from 'vue';

export interface ModalStore {
  open: <TReturn = unknown>(
    cmp: VueComponent,
    config?: ModalConfig
  ) => Promise<TReturn>;
  title: Ref<string | undefined>;
  close: <TReturn = unknown>(data?: TReturn) => void;
  component: ComputedRef<VueComponent | undefined>;
  config: ComputedRef<ModalConfig | undefined>;
  closeAll: () => void;
  modals: ShallowRef<Modal[]>;
  updateConfig: (config: Partial<ModalConfig>) => void;
}

export type ModalStoreDefinition = StoreDefinition<ModalStore>;
