import { mount } from '@vue/test-utils';
import { test, expect, vi, beforeEach } from 'vitest';
import MenuList from './MenuList.vue';
import { createTestingPinia } from '@pinia/testing';
import { useCommandsStore } from 'src/stores/command';
import type { MenuAction } from 'orgnote-api';

const CardWrapper = {
  template: '<div class="card-wrapper"><slot /></div>',
};
const MenuItem = {
  template: '<div class="menu-item" @click="$emit(\'click\')"><slot /></div>',
  props: ['icon', 'disabled'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('renders actions correctly', () => {
  const actions = [
    {
      command: 'testCommand',
    },
    {
      title: 'Manual Action',
      handler: vi.fn(),
      icon: 'manual-icon',
    },
  ];

  const wrapper = mount(MenuList, {
    props: {
      actions: actions as MenuAction[],
    },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            commands: {
              commands: [
                {
                  command: 'testCommand',
                  icon: 'command-icon',
                },
              ],
            },
          },
        }),
      ],
      stubs: {
        CardWrapper,
        MenuItem,
      },
    },
  });

  const items = wrapper.findAllComponents(MenuItem);
  expect(items).toHaveLength(2);
  expect(items[0]?.text()).toBe('Test Command');
  expect(items[1]?.text()).toBe('Manual Action');
});

test('executes command action and emits close', async () => {
  const actions = [
    {
      command: 'test-command',
    },
  ];

  const wrapper = mount(MenuList, {
    props: {
      actions: actions as MenuAction[],
      data: { some: 'data' },
    },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
        }),
      ],
      stubs: {
        CardWrapper,
        MenuItem,
      },
    },
  });

  const commandsStore = useCommandsStore();
  commandsStore.get = vi.fn().mockReturnValue({
    command: 'test-command',
    icon: 'command-icon',
  });
  commandsStore.execute = vi.fn();

  await wrapper.findComponent(MenuItem).trigger('click');

  expect(commandsStore.execute).toHaveBeenCalledWith('test-command', { some: 'data' });
  expect(wrapper.emitted('close')).toBeTruthy();
});

test('executes manual action and emits close', async () => {
  const handler = vi.fn();
  const actions = [
    {
      title: 'Manual Action',
      handler,
      icon: 'manual-icon',
    },
  ];

  const wrapper = mount(MenuList, {
    props: {
      actions: actions as MenuAction[],
      data: { some: 'data' },
    },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
        }),
      ],
      stubs: {
        CardWrapper,
        MenuItem,
      },
    },
  });

  await wrapper.findComponent(MenuItem).trigger('click');

  expect(handler).toHaveBeenCalledWith({ some: 'data' });
  expect(wrapper.emitted('close')).toBeTruthy();
});

test('hides command actions marked as hidden', () => {
  const wrapper = mount(MenuList, {
    props: {
      actions: [{ command: 'hidden-command' }] as MenuAction[],
    },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            commands: {
              commands: [
                {
                  command: 'hidden-command',
                  hide: () => true,
                },
              ],
            },
          },
        }),
      ],
      stubs: {
        CardWrapper,
        MenuItem,
      },
    },
  });

  expect(wrapper.findAllComponents(MenuItem)).toHaveLength(0);
});

test('renders disabled commands without executing or closing the menu', async () => {
  const wrapper = mount(MenuList, {
    props: {
      actions: [{ command: 'disabled-command' }] as MenuAction[],
    },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {
            commands: {
              commands: [
                {
                  command: 'disabled-command',
                  disabled: () => true,
                },
              ],
            },
          },
        }),
      ],
      stubs: {
        CardWrapper,
        MenuItem,
      },
    },
  });
  const commandsStore = useCommandsStore();
  commandsStore.execute = vi.fn();
  const item = wrapper.findComponent(MenuItem);

  expect(item.props('disabled')).toBe(true);
  await item.trigger('click');

  expect(commandsStore.execute).not.toHaveBeenCalled();
  expect(wrapper.emitted('close')).toBeUndefined();
});
