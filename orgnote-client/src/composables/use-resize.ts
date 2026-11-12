import { ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { clientOnly } from 'src/utils/platform-specific';

export type ResizeOrientation = 'horizontal' | 'vertical';

export const useResize = (
  orientation: ResizeOrientation,
  onResize: (delta: number) => void,
) => {
  const isResizing = ref(false);
  const startPosition = ref(0);

  const onMouseMove = (e: MouseEvent): void => {
    if (!isResizing.value) return;

    const currentPosition = orientation === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPosition - startPosition.value;
    onResize(delta);
  };

  const stopResize = (): void => {
    isResizing.value = false;
  };

  const startResize = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    isResizing.value = true;
    startPosition.value = orientation === 'horizontal' ? e.clientX : e.clientY;
  };

  clientOnly(() => {
    useEventListener(document, 'mousemove', onMouseMove);
    useEventListener(document, 'mouseup', stopResize);
  })();

  watch(isResizing, (resizing) => {
    clientOnly(() => {
      const cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.cursor = resizing ? cursor : '';
      document.body.style.userSelect = resizing ? 'none' : '';
    })();
  });

  return {
    isResizing,
    startResize,
    stopResize,
  };
};
