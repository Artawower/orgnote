import { api } from 'src/boot/api';
import { computed, onMounted, onUnmounted, watch, type Ref } from 'vue';

export function useNoteEditor(noteUri: Ref<string | undefined>) {
  const store = api.core.useBuffers();

  const currentBuffer = computed(() => {
    if (!noteUri.value) return null;
    return store.getBufferByUri(noteUri.value);
  });

  onMounted(async () => {
    if (!noteUri.value) return;
    await store.getOrCreateBuffer(noteUri.value);
  });

  onUnmounted(() => {
    if (!noteUri.value) return;
    store.releaseBuffer(noteUri.value);
  });

  watch(noteUri, async (next, prev) => {
    if (prev) store.releaseBuffer(prev);
    if (next) await store.getOrCreateBuffer(next);
  });

  const noteText = computed({
    get: (): string => {
      const b = currentBuffer.value;
      return b ? b.text : '';
    },
    set: (val: string) => {
      const b = currentBuffer.value;
      if (!b) return;
      b.setText(val);
    },
  });

  const isSaving = computed((): boolean => {
    const b = currentBuffer.value;
    return b ? b.isSaving : false;
  });

  const isLoading = computed((): boolean => {
    const b = currentBuffer.value;
    return b ? b.isLoading : false;
  });

  const saveBuffer = async (): Promise<void> => {
    if (!noteUri.value || !currentBuffer.value) return;
    return store.saveAllBuffers();
  };

  const closeBuffer = async (force = false): Promise<boolean> => {
    if (!noteUri.value) return true;
    return store.closeBuffer(noteUri.value, force);
  };

  return {
    noteText,
    isSaving,
    isLoading,
    saveBuffer,
    closeBuffer,
    currentBuffer,
  };
}
