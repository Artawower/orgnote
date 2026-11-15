import { mount } from '@vue/test-utils';
import { test, expect, vi, beforeEach } from 'vitest';
import ContextMenu from './ContextMenu.vue';
import { api } from 'src/boot/api';
import { QMenu } from 'quasar';
import { ref } from 'vue';

const desktopBelow = ref(false);

vi.mock('src/boot/api', async () => {
  const mockUseContextMenu = {
    getContextMenuActions: vi.fn().mockReturnValue([]),
  };

  const mockUseModal = {
    open: vi.fn(),
    close: vi.fn(),
  };

  return {
    api: {
      ui: {
        useContextMenu: () => mockUseContextMenu,
        useScreenDetection: () => ({ desktopBelow }),
        useModal: () => mockUseModal,
      },
    },
  };
});

vi.mock('quasar', () => {
  const QMenuMock = {
    template: '<div><slot /></div>',
    methods: {
      show: vi.fn(),
      hide: vi.fn(),
    },
  };
  return {
    QMenu: QMenuMock,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  desktopBelow.value = false;
});

const createPointerEvent = (type: string, x = 0, y = 0) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'touch',
    button: 0,
    clientX: x,
    clientY: y,
  });

const triggerLongPress = async (wrapper: ReturnType<typeof mount>) => {
  vi.useFakeTimers();
  wrapper.find('.context-menu-trigger').element.dispatchEvent(createPointerEvent('pointerdown', 10, 10));
  vi.advanceTimersByTime(300);
  document.dispatchEvent(createPointerEvent('pointerup', 10, 10));
  vi.useRealTimers();
};

test('renders slot content', () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    slots: {
      default: '<div class="trigger">Trigger</div>',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  expect(wrapper.find('.trigger').exists()).toBe(true);
});

test('opens QMenu on desktop when triggered', async () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  await wrapper.find('.context-menu-trigger').trigger('contextmenu');
  expect(wrapper.findComponent(QMenu).exists()).toBe(true);
  expect(api.ui.useModal().open).not.toHaveBeenCalled();
});

test('opens Modal on mobile after long press release', async () => {
  (api.ui.useScreenDetection().desktopBelow as unknown as { value: boolean }).value = true;

  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  await triggerLongPress(wrapper);

  expect(api.ui.useModal().open).toHaveBeenCalled();
  expect(api.ui.useModal().open).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      mini: true,
      position: 'bottom',
    }),
  );
});

test('does not open anything if disabled', async () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
      disabled: true,
    },
    global: {
      components: {
        QMenu,
      },
      stubs: {
        MenuList: true,
      },
    },
  });

  await wrapper.find('.context-menu-trigger').trigger('contextmenu');
  expect(api.ui.useModal().open).not.toHaveBeenCalled();
});

test('ContextMenu opens modal on mobile long press release', async () => {
  (api.ui.useScreenDetection().desktopBelow as unknown as { value: boolean }).value = true;

  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  await triggerLongPress(wrapper);

  expect(api.ui.useModal().open).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      mini: true,
      position: 'bottom',
    }),
  );
});

test('does not open modal on mobile long press when disabled', async () => {
  desktopBelow.value = true;

  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
      disabled: true,
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  await triggerLongPress(wrapper);

  expect(api.ui.useModal().open).not.toHaveBeenCalled();
});

test('ContextMenu exposed open emits open event and shows QMenu', () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  wrapper.vm.open();

  expect(wrapper.emitted('open')).toHaveLength(1);
  const qMenu = wrapper.findComponent(QMenu);
  expect(qMenu.exists()).toBe(true);
});

test('ContextMenu exposed close calls QMenu hide', () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  wrapper.vm.close();

  const qMenu = wrapper.findComponent(QMenu);
  expect(qMenu.exists()).toBe(true);
});

test('ContextMenu passes group to getContextMenuActions', () => {
  mount(ContextMenu, {
    props: {
      group: 'custom-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  expect(api.ui.useContextMenu().getContextMenuActions).toHaveBeenCalledWith('custom-group');
});

test('ContextMenu passes data prop to modal on mobile long press release', async () => {
  (api.ui.useScreenDetection().desktopBelow as unknown as { value: boolean }).value = true;

  const testData = { path: '/notes/test.org' };

  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
      data: testData,
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  await triggerLongPress(wrapper);

  expect(api.ui.useModal().open).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      modalProps: expect.objectContaining({
        data: testData,
      }),
    }),
  );
});

test('ContextMenu emits open on desktop contextmenu', async () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  await wrapper.find('.context-menu-trigger').trigger('contextmenu');

  expect(wrapper.emitted('open')).toHaveLength(1);
});

test('ContextMenu QMenu hide event calls close', async () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  const qMenu = wrapper.findComponent(QMenu);
  await qMenu.vm.$emit('hide');

  expect(qMenu.exists()).toBe(true);
});

test('ContextMenu mobile modal close callback calls modal.close', async () => {
  (api.ui.useScreenDetection().desktopBelow as unknown as { value: boolean }).value = true;

  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  await triggerLongPress(wrapper);

  const modalOpenCall = vi.mocked(api.ui.useModal().open).mock.calls[0]!;
  const modalEmits = modalOpenCall[1]?.modalEmits as { close: () => void };
  modalEmits.close();

  expect(api.ui.useModal().close).toHaveBeenCalled();
});
