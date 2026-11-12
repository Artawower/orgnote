import type { Ref } from 'vue';

export const withFlag = async <T>(flag: Ref<boolean>, action: () => Promise<T>): Promise<T> => {
  flag.value = true;
  return await action().finally(() => {
    flag.value = false;
  });
};

export const withDeferredFlagReset = <T>(flag: Ref<boolean>, action: () => T): T => {
  flag.value = true;
  const result = action();
  queueMicrotask(() => {
    flag.value = false;
  });
  return result;
};

