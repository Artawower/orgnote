import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { MiniEditorSchedule, MiniEditorSession } from './types';

export const buildEmptySession = (): MiniEditorSession => ({
  title: '',
  body: '',
  tags: [],
  priority: undefined,
  scheduled: undefined,
  isHabit: false,
  bodyLoaded: false,
  fullSize: false,
});

let iosCarrier: HTMLInputElement | null = null;

export const setIosCarrier = (el: HTMLInputElement): void => {
  iosCarrier?.remove();
  iosCarrier = el;
};

export const consumeIosCarrier = (): HTMLInputElement | null => {
  const carrier = iosCarrier;
  iosCarrier = null;
  return carrier;
};

export const useMiniEditorStore = defineStore('miniEditor', () => {
  const title = ref('');
  const body = ref('');
  const tags = ref<string[]>([]);
  const priority = ref<string | undefined>(undefined);
  const scheduled = ref<MiniEditorSchedule | undefined>(undefined);
  const isHabit = ref(false);
  const bodyLoaded = ref(false);
  const fullSize = ref(false);

  return { title, body, tags, priority, scheduled, isHabit, bodyLoaded, fullSize };
});
