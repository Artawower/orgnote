import type { Ref } from 'vue';

export interface KeyboardState {
  keyboardOpened: Readonly<Ref<boolean>>;
  keyboardHeight: Readonly<Ref<number>>;
}

export type UseKeyboardState = () => KeyboardState;
