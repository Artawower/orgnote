import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import FsSelectionStep from './FsSelectionStep.vue';

const mockCurrentFsName = ref('');
const mockFileSystems = ref<Array<{ name: string }>>([]);
const mockUseFs = vi.fn();

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileSystemManager: () => ({
        currentFsName: mockCurrentFsName,
        fileSystems: mockFileSystems,
        useFs: mockUseFs,
      }),
    },
  },
}));

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia');
  return {
    ...actual,
    storeToRefs: (store: unknown) => store,
  };
});

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual('vue-i18n');
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) };
});

vi.mock('orgnote-api', async () => {
  const actual = await vi.importActual('orgnote-api');
  return { ...actual, I18N: { CHOOSE_FILE_SYSTEM: 'choose file system' } };
});

const stubs = {
  PageWrapper: { template: '<div><slot /></div>' },
  AppFlex: { template: '<div><slot /></div>' },
  AppTitle: { template: '<h2><slot /></h2>' },
  StoragePicker: { template: '<div />' },
};

beforeEach(() => {
  mockCurrentFsName.value = '';
  mockFileSystems.value = [];
  mockUseFs.mockReset();
});

const mountStep = async () => {
  const wrapper = mount(FsSelectionStep, { global: { stubs } });
  await flushPromises();
  return wrapper;
};

test('FsSelectionStep auto-selects only available file system', async () => {
  mockFileSystems.value = [{ name: 'local' }];

  await mountStep();

  expect(mockUseFs).toHaveBeenCalledWith('local');
});

test('FsSelectionStep does not auto-select when multiple file systems are available', async () => {
  mockFileSystems.value = [{ name: 'local' }, { name: 'remote' }];

  await mountStep();

  expect(mockUseFs).not.toHaveBeenCalled();
});

test('FsSelectionStep does not auto-select when file system is already selected', async () => {
  mockCurrentFsName.value = 'existing';
  mockFileSystems.value = [{ name: 'local' }];

  await mountStep();

  expect(mockUseFs).not.toHaveBeenCalled();
});
