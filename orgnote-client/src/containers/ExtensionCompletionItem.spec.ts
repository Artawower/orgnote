import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import { DefaultCommands, type ExtensionMeta } from 'orgnote-api';
import ExtensionCompletionItem from './ExtensionCompletionItem.vue';

const execute = vi.fn(() => Promise.resolve());
const hasExtensionSettings = vi.fn(() => true);

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCommands: () => ({ execute }),
      useExtensions: () => ({ hasExtensionSettings }),
    },
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const AppFlexStub = defineComponent({
  name: 'AppFlex',
  template: '<div><slot /></div>',
});

const ActionButtonStub = defineComponent({
  name: 'ActionButton',
  emits: ['click'],
  template: '<button class="settings-action-stub" @click="$emit(\'click\', $event)" />',
});

const ToggleButtonStub = defineComponent({
  name: 'ToggleButton',
  props: {
    modelValue: Boolean,
  },
  emits: ['update:modelValue'],
  template:
    '<button class="toggle-action-stub" @click="$emit(\'update:modelValue\', !modelValue)" />',
});

const extension: ExtensionMeta = {
  active: true,
  manifest: {
    name: 'reader-mode',
    version: '1.0.0',
    description: 'Improve reading focus',
    category: 'extension',
    source: { type: 'builtin' },
  },
};

const mountItem = (onSelect = vi.fn()) =>
  mount(ExtensionCompletionItem, {
    props: {
      candidate: {
        title: extension.manifest.name,
        data: extension,
        commandHandler: vi.fn(),
      },
      index: 0,
      selected: true,
      searchQuery: '',
      onSelect,
    },
    global: {
      stubs: {
        ActionButton: ActionButtonStub,
        AppFlex: AppFlexStub,
        AppIcon: true,
        ToggleButton: ToggleButtonStub,
      },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  hasExtensionSettings.mockReturnValue(true);
  extension.active = true;
});

test('ExtensionCompletionItem renders the extension state', () => {
  const wrapper = mountItem();

  expect(wrapper.text()).toContain('reader-mode');
  expect(wrapper.text()).toContain('Improve reading focus');
  expect(wrapper.findComponent(ToggleButtonStub).props('modelValue')).toBe(true);
});

test('ExtensionCompletionItem toggles the selected extension', async () => {
  const onSelect = vi.fn();
  const wrapper = mountItem(onSelect);

  await wrapper.find('.toggle-action-stub').trigger('click');

  expect(onSelect).toHaveBeenCalledOnce();
  expect(execute).not.toHaveBeenCalled();
});

test('ExtensionCompletionItem opens settings without toggling the extension', async () => {
  const onSelect = vi.fn();
  const wrapper = mountItem(onSelect);

  await wrapper.find('.settings-action-stub').trigger('click');

  expect(execute).toHaveBeenCalledWith(DefaultCommands.OPEN_EXTENSION_SETTINGS, {
    extensionName: 'reader-mode',
  });
  expect(onSelect).not.toHaveBeenCalled();
});

test('ExtensionCompletionItem hides settings when the extension has no settings', () => {
  hasExtensionSettings.mockReturnValue(false);

  const wrapper = mountItem();

  expect(wrapper.find('.settings-action-stub').exists()).toBe(false);
});
