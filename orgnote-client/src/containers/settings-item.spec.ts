import { test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { OrgNoteConfig } from 'orgnote-api';
import SettingsItem from './SettingsItem.vue';
import { DEFAULT_CONFIG } from 'src/constants/config';
import type { ValibotScheme } from 'src/models/valibot-scheme';
import { defineComponent, h, nextTick } from 'vue';

vi.mock('src/boot/api', async () => {
  const { reactive } = await import('vue');
  const { DEFAULT_CONFIG } = await import('src/constants/config');

  const cloneConfig = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  const mockConfigState = reactive(cloneConfig());
  const mockUploadFile = vi.fn();

  return {
    api: {
      core: {
        useConfig: () => ({
          config: mockConfigState,
        }),
      },
      utils: {
        uploadFile: mockUploadFile,
      },
    },
  };
});

const cloneConfig = (): OrgNoteConfig => JSON.parse(JSON.stringify(DEFAULT_CONFIG));

const resetConfigState = async () => {
  const { api } = await import('src/boot/api');
  const fresh = cloneConfig();
  (Object.keys(fresh) as Array<keyof OrgNoteConfig>).forEach((key) => {
    api.core.useConfig().config[key] = fresh[key];
  });
};

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual('vue-i18n');

  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

const MenuItemStub = defineComponent({
  name: 'MenuItemStub',
  props: {
    type: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'div',
        {
          class: 'menu-item',
          'data-type': props.type,
          onClick: () => emit('click'),
        },
        [slots.default?.(), slots.right?.()],
      );
  },
});

const ToggleButtonStub = defineComponent({
  name: 'ToggleButtonStub',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'click'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        class: 'toggle-button',
        'data-checked': props.modelValue,
        onClick: () => {
          emit('click');
          emit('update:modelValue', !props.modelValue);
        },
      });
  },
});

const AppInputStub = defineComponent({
  name: 'AppInputStub',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        class: 'app-input',
        value: props.modelValue,
        onInput: (event: Event) => {
          const target = event.target as HTMLInputElement;
          emit('update:modelValue', target.value);
        },
      });
  },
});

const ActionButtonStub = defineComponent({
  name: 'ActionButtonStub',
  emits: ['click'],
  setup(_, { emit }) {
    return () =>
      h('button', {
        class: 'action-button',
        onClick: () => emit('click'),
      });
  },
});

const AppTextAreaStub = defineComponent({
  name: 'AppTextAreaStub',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('textarea', {
        value: props.modelValue,
        onInput: (event: Event) => {
          const target = event.target as HTMLTextAreaElement;
          emit('update:modelValue', target.value);
        },
      });
  },
});

const AppDescriptionStub = defineComponent({
  name: 'AppDescriptionStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'app-description' }, slots.default?.());
  },
});

const stubs = {
  MenuItem: MenuItemStub,
  ToggleButton: ToggleButtonStub,
  AppInput: AppInputStub,
  ActionButton: ActionButtonStub,
  AppTextArea: AppTextAreaStub,
  AppDescription: AppDescriptionStub,
};

beforeEach(async () => {
  await resetConfigState();
  const { api } = await import('src/boot/api');
  vi.mocked(api.utils.uploadFile).mockReset();
});

test('toggles boolean config value when menu item clicked', async () => {
  const { api } = await import('src/boot/api');
  const config = api.core.useConfig().config;

  config.ui.showUserProfiles = false;

  const wrapper = mount(SettingsItem, {
    props: {
      path: 'ui',
      name: 'showUserProfiles',
      scheme: { type: 'boolean' } as ValibotScheme,
    },
    global: {
      stubs,
    },
  });

  expect(config.ui.showUserProfiles).toBe(false);

  await wrapper.find('.menu-item').trigger('click');

  expect(config.ui.showUserProfiles).toBe(true);
});

test('appends empty value for array config when add item clicked', async () => {
  const { api } = await import('src/boot/api');
  const config = api.core.useConfig().config;

  config.extensions.sources = ['https://example.com'];

  const wrapper = mount(SettingsItem, {
    props: {
      path: 'extensions',
      name: 'sources',
      scheme: { type: 'array' } as ValibotScheme,
    },
    global: {
      stubs,
    },
  });

  await wrapper.find('[data-type="info"]').trigger('click');
  await nextTick();

  expect(config.extensions.sources.at(-1)).toBe('');
});
