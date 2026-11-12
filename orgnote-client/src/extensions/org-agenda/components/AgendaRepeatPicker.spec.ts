import { mount } from '@vue/test-utils';
import { test, expect, vi, beforeEach } from 'vitest';

const screenMocks = vi.hoisted(() => ({
  desktopBelow: { __v_isRef: true, value: false },
}));

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useScreenDetection: () => screenMocks,
    },
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mountRepeatPicker = async () => {
  const { default: AgendaRepeatPicker } = await import('./AgendaRepeatPicker.vue');
  return mount(AgendaRepeatPicker, {
    global: {
      stubs: {
        AppPopover: {
          template: '<div class="app-popover-stub"><slot :toggle="() => {}" /><slot name="content" /></div>',
        },
        AppFlex: { template: '<div><slot /></div>' },
        AppIcon: { template: '<span />' },
      },
    },
  });
};

beforeEach(() => {
  screenMocks.desktopBelow.value = false;
});

test('AgendaRepeatPicker uses popover on desktop', async () => {
  const wrapper = await mountRepeatPicker();

  expect(wrapper.find('.app-popover-stub').exists()).toBe(true);
  expect(wrapper.find('.repeat-inline').exists()).toBe(false);
});

test('AgendaRepeatPicker opens repeat options inline on mobile sheet', async () => {
  screenMocks.desktopBelow.value = true;
  const wrapper = await mountRepeatPicker();

  expect(wrapper.find('.app-popover-stub').exists()).toBe(false);
  expect(wrapper.find('.repeat-menu.inline').exists()).toBe(false);

  await wrapper.find('.repeat-trigger').trigger('click');

  expect(wrapper.find('.repeat-menu.inline').exists()).toBe(true);
});

test('AgendaRepeatPicker closes inline repeat options after selection', async () => {
  screenMocks.desktopBelow.value = true;
  const wrapper = await mountRepeatPicker();

  await wrapper.find('.repeat-trigger').trigger('click');
  await wrapper.findAll('.repeat-option')[1]?.trigger('click');

  expect(wrapper.find('.repeat-menu.inline').exists()).toBe(false);
});
