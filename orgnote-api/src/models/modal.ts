import { VueComponent } from './vue-component';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ModalConfig<T = any> {
  closable?: boolean;
  title?: string;
  modalProps?: T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modalEmits?: Record<string, (params: any) => any>;
  position?: 'top' | 'center' | 'bottom';
  fullScreen?: boolean;
  noHeaderPadding?: boolean;
  noBodyPadding?: boolean;
  wide?: boolean;
  mini?: boolean;
  headerTitleComponent?: VueComponent;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Modal<TReturn = any> {
  id: number;
  config?: ModalConfig;
  closed?: Promise<TReturn>;
  component: VueComponent;
}
