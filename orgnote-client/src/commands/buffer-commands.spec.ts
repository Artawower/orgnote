import { DefaultCommands, type OrgNoteApi } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { getBufferCommands } from './buffer-commands';

test('SHOW_OR_OPEN_BUFFER delegates its URI to the buffer viewer', async () => {
  const showOrOpen = vi.fn();
  const api = {
    core: { useBufferViewer: () => ({ showOrOpen }) },
  } as unknown as OrgNoteApi;
  const command = getBufferCommands().find(
    (candidate) => candidate.command === DefaultCommands.SHOW_OR_OPEN_BUFFER,
  );

  await command!.handler(api, { data: { uri: 'builtin:///agenda/pomodoro' }, meta: command! });

  expect(showOrOpen).toHaveBeenCalledWith('builtin:///agenda/pomodoro');
});

test('SHOW_OR_OPEN_BUFFER ignores invalid command data', async () => {
  const showOrOpen = vi.fn();
  const api = {
    core: { useBufferViewer: () => ({ showOrOpen }) },
  } as unknown as OrgNoteApi;
  const command = getBufferCommands()[0]!;

  await command.handler(api, { data: { uri: '   ' }, meta: command });

  expect(showOrOpen).not.toHaveBeenCalled();
});
