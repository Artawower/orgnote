import { beforeEach, expect, test, vi } from 'vitest';
import type { Command, CommandCallback, OrgNoteApi } from 'orgnote-api';
import {
  quickAddToFileCommand,
  subscribeToQuickAddToFileCommand,
} from './quick-add-to-file-command';

const unsubscribe = vi.fn();
let callback: CommandCallback | undefined;

const commands = {
  afterExecute: vi.fn((_name: string, nextCallback: CommandCallback) => {
    callback = nextCallback;
    return unsubscribe;
  }),
} as unknown as ReturnType<OrgNoteApi['core']['useCommands']>;

beforeEach(() => {
  callback = undefined;
  vi.clearAllMocks();
});

test('subscribeToQuickAddToFileCommand forwards validated file paths', () => {
  const selectTargetFile = vi.fn();
  const dispose = subscribeToQuickAddToFileCommand(commands, selectTargetFile);

  callback?.(quickAddToFileCommand as Command, { filePath: '/agenda/work.org' });

  expect(selectTargetFile).toHaveBeenCalledWith('/agenda/work.org');
  expect(dispose).toBe(unsubscribe);
});

test('subscribeToQuickAddToFileCommand rejects invalid command data', () => {
  const selectTargetFile = vi.fn();
  subscribeToQuickAddToFileCommand(commands, selectTargetFile);

  callback?.(quickAddToFileCommand as Command, { filePath: 42 });

  expect(selectTargetFile).not.toHaveBeenCalled();
});
