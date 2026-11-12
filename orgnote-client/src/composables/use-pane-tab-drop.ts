import { onUnmounted, ref, type Ref } from 'vue';
import type { DropDirection, DropZone, Tab } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { resolveReorderIndex } from 'src/utils/tab-drop-position';

interface DraggedTab {
  tabId: string;
  paneId: string;
}

export function usePaneTabDrop(getPaneId: () => string, tabs: Readonly<Ref<Tab[]>>) {
  const pane = api.core.usePane();
  const layout = api.core.useLayout();
  const currentDropZone = ref<DropZone | undefined>();
  let dragStartTimer: ReturnType<typeof setTimeout> | undefined;

  const clearDragStartTimer = (): void => {
    if (dragStartTimer === undefined) return;
    clearTimeout(dragStartTimer);
    dragStartTimer = undefined;
  };

  const handleDragStart = (payload: DraggedTab): void => {
    clearDragStartTimer();
    dragStartTimer = setTimeout(() => {
      dragStartTimer = undefined;
      pane.startDraggingTab(payload.tabId, payload.paneId);
    }, 0);
  };

  const handleDragEnd = (): void => {
    clearDragStartTimer();
    pane.stopDraggingTab();
    currentDropZone.value = undefined;
  };

  const moveTabToCenter = async ({ tabId, paneId }: DraggedTab): Promise<void> => {
    if (paneId === getPaneId()) return;
    await pane.moveTab(tabId, paneId, getPaneId());
  };

  const rollbackNewPane = (newPaneId: string, sourcePaneId: string): void => {
    pane.closePane(newPaneId);
    layout.removePaneFromLayout(newPaneId);
    pane.setActivePane(sourcePaneId);
  };

  const moveTabToNewPane = async (
    direction: DropDirection,
    { tabId, paneId }: DraggedTab,
  ): Promise<void> => {
    const newPaneId = await layout.splitPaneInLayout(getPaneId(), direction, false);
    if (!newPaneId) return;
    const movedTab = await pane.moveTab(tabId, paneId, newPaneId);
    if (movedTab) return;
    rollbackNewPane(newPaneId, paneId);
  };

  const dropTabOnZone = async (zone: DropZone, draggedTab: DraggedTab): Promise<void> => {
    if (zone === 'center') {
      await moveTabToCenter(draggedTab);
      return;
    }
    await moveTabToNewPane(zone, draggedTab);
  };

  const reorderTab = async (tabId: string, gapIndex: number): Promise<void> => {
    const fromIndex = tabs.value.findIndex((tab) => tab.id === tabId);
    if (fromIndex < 0) return;
    const toIndex = resolveReorderIndex(fromIndex, gapIndex);
    if (toIndex === undefined) return;
    await pane.moveTab(tabId, getPaneId(), getPaneId(), toIndex);
  };

  const dropTabIntoStrip = async (gapIndex: number, draggedTab: DraggedTab): Promise<void> => {
    if (draggedTab.paneId === getPaneId()) {
      await reorderTab(draggedTab.tabId, gapIndex);
      return;
    }
    await pane.moveTab(draggedTab.tabId, draggedTab.paneId, getPaneId(), gapIndex);
  };

  const runTabDrop = async (
    dropAction: (draggedTab: DraggedTab) => Promise<void>,
  ): Promise<void> => {
    const draggedTab = pane.draggedTabData;
    if (!draggedTab) {
      handleDragEnd();
      return;
    }
    const result = await to(() => dropAction(draggedTab))();
    handleDragEnd();
    if (result.isErr()) reporter.reportError(result.error);
  };

  const handleZoneDrop = (zone: DropZone): Promise<void> =>
    runTabDrop((draggedTab) => dropTabOnZone(zone, draggedTab));

  const handleStripDrop = ({ gapIndex }: { gapIndex: number }): Promise<void> =>
    runTabDrop((draggedTab) => dropTabIntoStrip(gapIndex, draggedTab));

  onUnmounted(handleDragEnd);

  return {
    currentDropZone,
    handleDragStart,
    handleDragEnd,
    handleZoneDrop,
    handleStripDrop,
  };
}
