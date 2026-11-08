import { expect, test, vi } from 'vitest';
import { DefaultCommands, RouteNames, type CommandMeta, type OrgNoteApi } from 'orgnote-api';
import { getNoteCommands } from './note-commands';

test('PREVIEW_NOTE ensures the existing layout before opening the embedded buffer', async () => {
  const ensureLayout = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn().mockResolvedValue(undefined);
  const create = vi.fn().mockReturnValue('embedded:///preview.org');
  const push = vi.fn().mockResolvedValue(undefined);
  const api = {
    core: {
      useLayout: () => ({ ensureLayout }),
      useBufferViewer: () => ({ open }),
      useEmbeddedBuffer: () => ({ create }),
    },
    vue: {
      router: {
        currentRoute: { value: { name: RouteNames.Panes } },
        push,
      },
    },
  } as unknown as OrgNoteApi;
  const command = getNoteCommands().find(
    ({ command }) => command === DefaultCommands.PREVIEW_NOTE,
  );

  await command?.handler(api, {
    data: { text: 'Preview' },
    meta: {} as CommandMeta,
  });

  expect(push).not.toHaveBeenCalled();
  expect(ensureLayout).toHaveBeenCalledOnce();
  expect(create).toHaveBeenCalledWith('Preview');
  expect(open).toHaveBeenCalledWith('embedded:///preview.org');
});
