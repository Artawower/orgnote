import { ref, readonly } from 'vue';

export function useDragStatus() {
  const dragInProgress = ref(false);
  let dragCounter = 0;

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      dragInProgress.value = true;
    }
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dragInProgress.value = false;
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const reset = () => {
    dragCounter = 0;
    dragInProgress.value = false;
  };

  return {
    dragInProgress: readonly(dragInProgress),
    onDragEnter,
    onDragLeave,
    onDragOver,
    reset,
  };
}
