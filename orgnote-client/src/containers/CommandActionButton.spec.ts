import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import CommandActionButton from './CommandActionButton.vue';

const { executeMock, getMock, focusEditorMock } = vi.hoisted(() => ({
  executeMock: vi.fn(async () => undefined),
  getMock: vi.fn(() => ({
    command: 'editor.insertBold',
    icon: 'sym_o_format_bold',
  })),
  focusEditorMock: vi.fn(),
}));

vi.mock('src/stores/command', () => ({
  useCommandsStore: () => ({
    get: getMock,
    execute: executeMock,
  }),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useEditor: () => ({
        activeContext: {
          editorViewGetter: () => ({ id: 'editor-view' }),
        },
      }),
    },
  },
}));

vi.mock('src/composables/use-resolved-icon', () => ({
  useResolvedIcon: () => ({
    iconString: ref('sym_o_format_bold'),
    iconComponent: undefined,
  }),
}));

vi.mock('src/stores/config', () => ({
  useConfigStore: () => ({
    config: ref({
      ui: {
        tooltipDelay: 0,
      },
    }),
  }),
}));

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia');
  return {
    ...actual,
    storeToRefs: <T>(store: T) => store,
  };
});

vi.mock('src/utils/editor-primitives', () => ({
  focusEditor: focusEditorMock,
}));

vi.mock('src/utils/camel-case-to-words', () => ({
  camelCaseToWords: (value: string) => value,
}));

const mountComponent = (executeOnPointerDown = false) =>
  mount(CommandActionButton, {
    props: {
      command: 'editor.insertBold',
      executeOnPointerDown,
    },
    global: {
      stubs: {
        QTooltip: true,
        AppIcon: true,
        AnimationWrapper: {
          template: '<div><slot /></div>',
        },
      },
    },
  });

beforeEach(() => {
  executeMock.mockClear();
  getMock.mockClear();
  focusEditorMock.mockClear();
});

test('CommandActionButton executes command on click', async () => {
  const wrapper = mountComponent(false);

  await wrapper.find('button').trigger('click');

  expect(executeMock).toHaveBeenCalledTimes(1);
  expect(executeMock).toHaveBeenCalledWith('editor.insertBold', undefined);
});

test('CommandActionButton executes command and emits executed event with focus loss prevention', async () => {
  const wrapper = mountComponent(true);

  await wrapper.find('button').trigger('click');

  expect(executeMock).toHaveBeenCalledTimes(1);
  expect(wrapper.emitted('executed')).toHaveLength(1);
});

test('CommandActionButton refocuses editor after execution when focus loss prevention is enabled', async () => {
  const wrapper = mountComponent(true);

  await wrapper.find('button').trigger('click');

  expect(focusEditorMock).toHaveBeenCalled();
});

test('CommandActionButton does not refocus editor when focus loss prevention is disabled', async () => {
  const wrapper = mountComponent(false);

  await wrapper.find('button').trigger('click');

  expect(focusEditorMock).not.toHaveBeenCalled();
});

test('CommandActionButton prevents mousedown default when focus loss prevention is enabled', () => {
  const wrapper = mountComponent(true);
  const button = wrapper.find('button');

  const event = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
  button.element.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
});

test('CommandActionButton does not prevent mousedown default when focus loss prevention is disabled', () => {
  const wrapper = mountComponent(false);
  const button = wrapper.find('button');

  const event = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
  button.element.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
});
