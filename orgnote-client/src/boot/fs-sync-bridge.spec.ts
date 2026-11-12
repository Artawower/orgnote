import { beforeEach, expect, test, vi } from 'vitest';
import boot from './fs-sync-bridge';

type ActionAfter = (callback: (result: unknown) => void) => void;
type ActionError = (callback: (error: unknown) => void) => void;
type ActionListener = (context: {
  readonly name: string;
  readonly args: unknown[];
  readonly after: ActionAfter;
  readonly onError: ActionError;
}) => void;

class MissingActionListenerError extends Error {}

const mocks = vi.hoisted(() => ({
  actionListener: undefined as ActionListener | undefined,
  reportWarning: vi.fn(),
  sync: vi.fn(),
}));

vi.mock('src/stores/file-system', () => ({
  useFileSystemStore: vi.fn(() => ({
    $onAction: (listener: ActionListener) => {
      mocks.actionListener = listener;
      return vi.fn();
    },
  })),
}));

vi.mock('src/stores/sync', () => ({
  useSyncStore: vi.fn(() => ({ sync: mocks.sync })),
}));

vi.mock('src/utils/debounce', () => ({
  debounce: (callback: (...args: unknown[]) => unknown) => callback,
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportWarning: mocks.reportWarning },
}));

const dispatchAction = (name: string, args: unknown[]): void => {
  const listener = mocks.actionListener;
  if (!listener) throw new MissingActionListenerError();
  listener({
    name,
    args,
    after: (callback) => callback(undefined),
    onError: vi.fn(),
  });
};

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.actionListener = undefined;
  mocks.sync.mockResolvedValue(undefined);
  await boot({ store: {} } as never);
});

test('filesystem write action schedules sync for user content', () => {
  dispatchAction('writeFile', ['/notes/a.org', 'content']);

  expect(mocks.sync).toHaveBeenCalledOnce();
});

test('filesystem write action ignores extension runtime paths', () => {
  dispatchAction('writeFile', [
    '/.orgnote/extensions/drawing-viewer/1.0.0/index.js',
    'content',
  ]);

  expect(mocks.sync).not.toHaveBeenCalled();
});

test('filesystem write action supports path arrays', () => {
  dispatchAction('writeFile', [
    ['.orgnote', 'extensions', 'drawing-viewer', 'index.js'],
    'content',
  ]);

  expect(mocks.sync).not.toHaveBeenCalled();
});

test('filesystem write action ignores conflict artifacts', () => {
  dispatchAction('writeFile', [
    '/.orgnote/config.sync-conflict-100-device-remote.toml',
    'content',
  ]);

  expect(mocks.sync).not.toHaveBeenCalled();
});

test('filesystem rename action schedules sync when a path leaves runtime', () => {
  dispatchAction('rename', [
    '/.orgnote/extensions/example/index.js',
    '/notes/example.js',
  ]);

  expect(mocks.sync).toHaveBeenCalledOnce();
});

test('filesystem rename action ignores changes contained in runtime', () => {
  dispatchAction('rename', [
    '/.orgnote/extensions/example/index.js.tmp',
    '/.orgnote/extensions/example/index.js',
  ]);

  expect(mocks.sync).not.toHaveBeenCalled();
});

test('filesystem copy action checks only its destination', () => {
  dispatchAction('copyFile', [
    '/notes/source.org',
    '/.orgnote/extensions/example/index.js',
  ]);

  expect(mocks.sync).not.toHaveBeenCalled();
});

test('filesystem syncFile action does not schedule another sync', () => {
  dispatchAction('syncFile', ['/notes/remote.org', 'content', 100]);

  expect(mocks.sync).not.toHaveBeenCalled();
});
