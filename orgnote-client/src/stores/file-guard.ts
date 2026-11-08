import { defineStore } from 'pinia';
import type {
  FileGuard,
  FileGuardStore,
  DiskFile,
  ValidationError,
} from 'orgnote-api';
import { ref } from 'vue';

export const useFileGuardStore = defineStore<'file-guard', FileGuardStore>(
  'file-guard',
  () => {
    const guards = ref<FileGuard[]>([]);

    const register = (guard: FileGuard): void => {
      guards.value = guards.value.filter((g) => g.id !== guard.id);
      guards.value = [...guards.value, guard];
    };

    const unregister = (id: string): void => {
      guards.value = guards.value.filter((g) => g.id !== id);
    };

    const getGuard = (path: string, file?: DiskFile): FileGuard | undefined => {
      return guards.value.find((g) => g.matcher(path, file));
    };

    const isReadOnly = (path: string, file?: DiskFile): boolean => {
      const guard = getGuard(path, file);
      return guard?.readonly ?? false;
    };

    const getReadOnlyReason = (path: string, file?: DiskFile): string | undefined => {
      const guard = getGuard(path, file);
      if (!guard?.readonly) {
        return undefined;
      }
      return guard.reason;
    };

    const validate = async (
      path: string,
      content: string | Uint8Array,
      file?: DiskFile,
    ): Promise<ValidationError[]> => {
      const guard = getGuard(path, file);
      if (!guard?.validator) {
        return [];
      }
      return guard.validator(content);
    };

    const store: FileGuardStore = {
      guards,
      register,
      unregister,
      getGuard,
      isReadOnly,
      getReadOnlyReason,
      validate,
    };

    return store;
  },
);
