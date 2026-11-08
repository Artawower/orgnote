import { expect, test, vi } from 'vitest';
import { DefaultCommands, RouteNames, type OrgNoteApi } from 'orgnote-api';
import type { Router } from 'vue-router';
import { GRAPH_BUFFER_URI } from 'src/constants/graph-buffer';
import { getGlobalCommands } from './global-commands';

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useSidebar: () => ({}),
      useRightSidebar: () => ({}),
      useModal: () => ({}),
    },
  },
}));

test('OPEN_GRAPH ensures the existing layout before opening the graph buffer', async () => {
  const ensureLayout = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn().mockResolvedValue(undefined);
  const push = vi.fn().mockResolvedValue(undefined);
  const router = {
    currentRoute: { value: { name: RouteNames.Panes } },
    push,
  } as unknown as Router;
  const api = {
    core: {
      useLayout: () => ({ ensureLayout }),
      useBufferViewer: () => ({ open }),
    },
  } as unknown as OrgNoteApi;
  const command = getGlobalCommands(router).find(
    ({ command }) => command === DefaultCommands.OPEN_GRAPH,
  );

  await command?.handler(api, undefined as never);

  expect(push).not.toHaveBeenCalled();
  expect(ensureLayout).toHaveBeenCalledOnce();
  expect(open).toHaveBeenCalledWith(GRAPH_BUFFER_URI);
  expect(ensureLayout.mock.invocationCallOrder[0]!).toBeLessThan(
    open.mock.invocationCallOrder[0]!,
  );
});
