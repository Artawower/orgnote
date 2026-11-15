import { beforeEach, expect, test, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { BufferActivationCallback, BufferActivatedEvent } from 'orgnote-api';
import { FileManagerRef } from 'src/containers/file-manager-ref';

let activationCallback: BufferActivationCallback | undefined;
const execute = vi.fn();
const unsubscribe = vi.fn();
const afterBufferActivated = vi.fn((callback: BufferActivationCallback) => {
  activationCallback = callback;
  return unsubscribe;
});
const config = {
  ui: {
    followActiveBufferInSidebar: false,
  },
};
const fileManager = {
  path: '/',
  searchQuery: '',
};
const sidebar = {
  opened: false,
  setComponent: vi.fn(),
};

vi.mock('src/utils/get-file-dir-path', () => ({
  getFileDirPath: () => '/notes',
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCommands: () => ({ execute }),
      useConfig: () => ({ config }),
      useFileManager: () => fileManager,
      usePane: () => ({ afterBufferActivated }),
    },
    ui: {
      useSidebar: () => sidebar,
    },
  },
}));

import { useFileManagerBufferFollow } from './use-file-manager-buffer-follow';

const TestHost = defineComponent({
  setup() {
    useFileManagerBufferFollow();
    return () => h('div');
  },
});

const activateBuffer = async (uri: string): Promise<void> => {
  const event: BufferActivatedEvent = {
    current: { paneId: 'pane-1', tabId: 'tab-1', uri },
  };
  await activationCallback?.(event);
};

beforeEach(() => {
  activationCallback = undefined;
  config.ui.followActiveBufferInSidebar = false;
  fileManager.path = '/';
  fileManager.searchQuery = 'filtered';
  sidebar.opened = false;
  sidebar.setComponent.mockReset();
  execute.mockReset();
  unsubscribe.mockReset();
  afterBufferActivated.mockClear();
});

test('selects the active file without opening a closed sidebar', async () => {
  config.ui.followActiveBufferInSidebar = true;
  mount(TestHost);

  await activateBuffer('file:///notes/today.org');

  expect(afterBufferActivated).toHaveBeenCalledWith(expect.any(Function), { immediate: true });
  expect(fileManager.path).toBe('/notes');
  expect(fileManager.searchQuery).toBe('');
  expect(sidebar.setComponent).toHaveBeenCalledWith(FileManagerRef, {
    componentProps: { closable: false, tree: true, compact: true },
  });
  expect(sidebar.opened).toBe(false);
});

test('keeps an open sidebar open while selecting the active file', async () => {
  config.ui.followActiveBufferInSidebar = true;
  sidebar.opened = true;
  mount(TestHost);

  await activateBuffer('file:///notes/today.org');

  expect(sidebar.setComponent).toHaveBeenCalledWith(FileManagerRef, {
    componentProps: { closable: false, tree: true, compact: true },
  });
  expect(sidebar.opened).toBe(true);
});

test('ignores disabled and non-file buffer activation', async () => {
  const wrapper = mount(TestHost);

  await activateBuffer('file:///notes/today.org');
  config.ui.followActiveBufferInSidebar = true;
  await activateBuffer('builtin:///agenda/tasks');

  expect(fileManager.path).toBe('/');
  expect(sidebar.setComponent).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('unsubscribes when the host scope is disposed', () => {
  const wrapper = mount(TestHost);

  wrapper.unmount();

  expect(unsubscribe).toHaveBeenCalledOnce();
});
