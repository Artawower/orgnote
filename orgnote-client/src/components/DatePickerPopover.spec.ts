import { flushPromises, mount } from '@vue/test-utils';
import { ref, type Component } from 'vue';
import { test, expect, vi, beforeEach } from 'vitest';

const desktopBelow = ref(false);
const modalOpen = vi.fn();
const reportError = vi.fn();
const togglePopover = vi.fn();

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useScreenDetection: () => ({ desktopBelow }),
      useModal: () => ({ open: modalOpen }),
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportError },
}));

const mountPopover = async (props: Record<string, unknown> = {}) => {
  const { default: DatePickerPopover } = await import('./DatePickerPopover.vue');
  return mount(DatePickerPopover, {
    props: {
      modelValue: '2026-06-18',
      confirmMode: true,
      showShortcuts: false,
      ...props,
    },
    slots: {
      trigger: '<template #trigger="{ open }"><button class="trigger" @click="open">open</button></template>',
      sections: '<div class="custom-section">Repeat</div>',
    },
    global: {
      stubs: {
        AppPopover: {
          template: '<div><slot :toggle="toggle" /><slot name="content" /></div>',
          setup: () => ({ toggle: togglePopover }),
        },
        DatePickerSheet: { template: '<div class="sheet" />' },
      },
    },
  });
};

beforeEach(() => {
  desktopBelow.value = false;
  modalOpen.mockReset();
  modalOpen.mockResolvedValue(undefined);
  reportError.mockReset();
  togglePopover.mockReset();
});

test('DatePickerPopover opens mobile sheet even when custom sections are provided', async () => {
  desktopBelow.value = true;
  const wrapper = await mountPopover();

  await wrapper.find('.trigger').trigger('click');
  await flushPromises();

  expect(togglePopover).not.toHaveBeenCalled();
  expect(modalOpen).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ mini: true }),
  );

  const sheetComponent = modalOpen.mock.calls[0]?.[0] as Component;
  const sheetWrapper = mount(sheetComponent, {
    global: {
      stubs: {
        DatePickerSheetModal: {
          template: '<div><slot name="sections" /></div>',
        },
      },
    },
  });

  expect(sheetWrapper.find('.custom-section').exists()).toBe(true);
});

test('DatePickerPopover returns a mobile range selection', async () => {
  desktopBelow.value = true;
  modalOpen.mockResolvedValue({
    selection: { from: '2026-06-18', to: '2026-06-22' },
  });
  const wrapper = await mountPopover({
    modelValue: { from: '2026-06-18', to: '2026-06-20' },
    selectionMode: 'both',
  });

  await wrapper.find('.trigger').trigger('click');
  await flushPromises();

  expect(wrapper.emitted('update:modelValue')).toEqual([
    [{ from: '2026-06-18', to: '2026-06-22' }],
  ]);
  expect(wrapper.emitted('confirm')).toEqual([
    [{ from: '2026-06-18', to: '2026-06-22' }],
  ]);
});

test('DatePickerPopover keeps desktop custom content in popover', async () => {
  desktopBelow.value = false;
  const wrapper = await mountPopover();

  await wrapper.find('.trigger').trigger('click');

  expect(togglePopover).toHaveBeenCalledOnce();
  expect(modalOpen).not.toHaveBeenCalled();
});
