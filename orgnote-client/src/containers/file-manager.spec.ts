import { expect, test, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, nextTick, type PropType } from 'vue';

type FileEntry = { path: string; name: string; type: 'file' | 'directory' };

const fileManagerFiles = ref<FileEntry[]>([]);
const fileManagerSortedFiles = ref<FileEntry[]>([]);

let fileManagerPath: ReturnType<typeof ref<string>>;
let fileManagerSearchQuery: ReturnType<typeof ref<string>>;
let fileManagerMobileFileSearchActive: ReturnType<typeof ref<boolean>>;
let activeBufferUri: ReturnType<typeof ref<string | undefined>>;
let sidebarOpened: ReturnType<typeof ref<boolean>>;
let tabletBelow: ReturnType<typeof ref<boolean>>;
let desktopBelow: ReturnType<typeof ref<boolean>>;
let scrollIntoView: ReturnType<typeof vi.fn>;
const config = {
  ui: {
    followActiveBufferInSidebar: false,
  },
};

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileManager: () => ({
        path: fileManagerPath,
        searchQuery: fileManagerSearchQuery,
        mobileFileSearchActive: fileManagerMobileFileSearchActive,
        selectedFiles: ref(new Set<string>()),
        selectionMode: ref(false),
        pendingOperation: ref(undefined),
        operationTargets: ref([]),
        focusFile: ref(undefined),
        files: fileManagerFiles,
        sortConfig: ref({ field: 'name', direction: 'asc', directoriesFirst: true }),
        sortedFiles: fileManagerSortedFiles,
        toggleSelection: vi.fn(),
        clearSelection: vi.fn(),
        loadFiles: vi.fn(),
      }),
      useBufferViewer: () => ({ open: vi.fn() }),
      useConfig: () => ({ config }),
      usePane: () => ({
        get activeBufferUri() {
          return activeBufferUri.value;
        },
      }),
      useEditor: () => ({ activeContext: undefined }),
    },
    ui: {
      useSidebar: () => ({
        close: vi.fn(),
        get opened() {
          return sidebarOpened.value;
        },
      }),
      useScreenDetection: () => ({ tabletBelow, desktopBelow }),
      useContextMenu: () => ({
        show: vi.fn(),
        hide: vi.fn(),
        visible: ref(false),
      }),
      useModal: () => ({
        open: vi.fn(),
        close: vi.fn(),
      }),
    },
  },
}));

import FileManager from './FileManager.vue';

beforeEach(() => {
  fileManagerPath = ref('/initial');
  fileManagerSearchQuery = ref('');
  fileManagerMobileFileSearchActive = ref(false);
  activeBufferUri = ref(undefined);
  sidebarOpened = ref(true);
  fileManagerFiles.value = [];
  fileManagerSortedFiles.value = [];
  tabletBelow = ref(false);
  desktopBelow = ref(false);
  config.ui.followActiveBufferInSidebar = false;
  scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
});

test('FileManager shows header search on desktop regardless of compact', async () => {
  tabletBelow.value = false;
  const wrapper = mount(FileManager, {
    props: { path: '/initial', compact: true },
  });
  await nextTick();

  const searchInput = wrapper.findComponent({ name: 'SearchInput' });
  expect(searchInput.exists()).toBe(true);
});

test('FileManager hides header search on mobile when compact', async () => {
  tabletBelow.value = true;
  desktopBelow.value = true;
  const wrapper = mount(FileManager, {
    props: { path: '/initial', compact: true },
  });
  await nextTick();

  const searchInput = wrapper.findComponent({ name: 'SearchInput' });
  expect(searchInput.exists()).toBe(false);
});

test('FileManager shows header search on mobile when not compact', async () => {
  tabletBelow.value = true;
  desktopBelow.value = true;
  const wrapper = mount(FileManager, {
    props: { path: '/initial', compact: false },
  });
  await nextTick();

  const searchInput = wrapper.findComponent({ name: 'SearchInput' });
  expect(searchInput.exists()).toBe(true);
});

test('FileManager uses store search query for filtering', async () => {
  fileManagerSearchQuery.value = 'test-query';
  const wrapper = mount(FileManager, {
    props: { path: '/initial' },
  });
  await nextTick();

  const searchInput = wrapper.findComponent({ name: 'SearchInput' });
  expect(searchInput.exists()).toBe(true);
  expect(searchInput.props('modelValue')).toBe('test-query');
});

test('FileManager does not show loading dots when files are already loaded before mount', async () => {
  fileManagerFiles.value = [{ path: '/initial/demo-1.org', name: 'demo-1.org', type: 'file' }];
  fileManagerSortedFiles.value = [...fileManagerFiles.value];

  const wrapper = mount(FileManager, {
    props: { path: '/initial' },
  });
  await nextTick();

  expect(wrapper.findComponent({ name: 'LoadingDots' }).exists()).toBe(false);
});

test('FileManager scrolls the active file into view when buffer following is enabled', async () => {
  const activeFile = { path: '/initial/demo-1.org', name: 'demo-1.org', type: 'file' as const };
  fileManagerFiles.value = [activeFile];
  fileManagerSortedFiles.value = [activeFile];
  activeBufferUri.value = 'file:///initial/demo-1.org';
  config.ui.followActiveBufferInSidebar = true;

  const wrapper = mount(FileManager, { props: { path: '/initial' } });
  await nextTick();
  await nextTick();
  await nextTick();

  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  wrapper.unmount();
});

test('FileManager scrolls through a semantic marker without an active CSS class', async () => {
  const activeFile = { path: '/initial/demo-1.org', name: 'demo-1.org', type: 'file' as const };
  fileManagerFiles.value = [activeFile];
  fileManagerSortedFiles.value = [activeFile];
  activeBufferUri.value = 'file:///initial/demo-1.org';
  config.ui.followActiveBufferInSidebar = true;
  const FileManagerItemStub = defineComponent({
    setup() {
      return () => h('div', { 'data-file-manager-active': '' });
    },
  });

  const wrapper = mount(FileManager, {
    props: { path: '/initial' },
    global: { stubs: { FileManagerItem: FileManagerItemStub } },
  });
  await nextTick();
  await nextTick();

  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  wrapper.unmount();
});

test('FileManager rerenders only the previous and next active items', async () => {
  const files: FileEntry[] = [
    { path: '/initial/demo-1.org', name: 'demo-1.org', type: 'file' },
    { path: '/initial/demo-2.org', name: 'demo-2.org', type: 'file' },
    { path: '/initial/demo-3.org', name: 'demo-3.org', type: 'file' },
  ];
  fileManagerFiles.value = files;
  fileManagerSortedFiles.value = files;
  activeBufferUri.value = 'file:///initial/demo-1.org';
  config.ui.followActiveBufferInSidebar = true;
  const renderCounts = new Map<string, number>();
  const FileManagerItemStub = defineComponent({
    props: {
      active: Boolean,
      file: Object as PropType<FileEntry>,
    },
    setup(props) {
      return () => {
        const path = props.file?.path;
        if (path) renderCounts.set(path, (renderCounts.get(path) ?? 0) + 1);
        return h('div', { 'data-file-manager-active': props.active || undefined });
      };
    },
  });
  const wrapper = mount(FileManager, {
    props: { path: '/initial' },
    global: { stubs: { FileManagerItem: FileManagerItemStub } },
  });
  await nextTick();
  await nextTick();
  await nextTick();
  renderCounts.clear();
  scrollIntoView.mockClear();

  activeBufferUri.value = 'file:///initial/demo-2.org';
  await nextTick();
  await nextTick();

  expect(Object.fromEntries(renderCounts)).toEqual({
    '/initial/demo-1.org': 1,
    '/initial/demo-2.org': 1,
  });
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  wrapper.unmount();
});

test('FileManager does not scroll the active file while sidebar is closed', async () => {
  const activeFile = { path: '/initial/demo-1.org', name: 'demo-1.org', type: 'file' as const };
  fileManagerFiles.value = [activeFile];
  fileManagerSortedFiles.value = [activeFile];
  activeBufferUri.value = 'file:///initial/demo-1.org';
  config.ui.followActiveBufferInSidebar = true;
  sidebarOpened.value = false;

  const wrapper = mount(FileManager, { props: { path: '/initial' } });
  await nextTick();
  await nextTick();

  expect(scrollIntoView).not.toHaveBeenCalled();
  wrapper.unmount();
});

test('FileManager does not scroll the active file when buffer following is disabled', async () => {
  const activeFile = { path: '/initial/demo-1.org', name: 'demo-1.org', type: 'file' as const };
  fileManagerFiles.value = [activeFile];
  fileManagerSortedFiles.value = [activeFile];
  activeBufferUri.value = 'file:///initial/demo-1.org';

  const wrapper = mount(FileManager, { props: { path: '/initial' } });
  await nextTick();
  await nextTick();

  expect(scrollIntoView).not.toHaveBeenCalled();
  wrapper.unmount();
});
