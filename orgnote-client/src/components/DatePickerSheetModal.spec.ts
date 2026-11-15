import { mount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';

const modalClose = vi.fn();

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useModal: () => ({ close: modalClose }),
    },
  },
}));

const mountModal = async () => {
  const { default: DatePickerSheetModal } = await import('./DatePickerSheetModal.vue');
  return mount(DatePickerSheetModal, {
    props: {
      modelValue: '2026-06-18',
      confirmMode: true,
    },
    slots: {
      header: '<div class="custom-header">Date</div>',
      sections: '<div class="custom-sections">Repeat</div>',
      footer: '<template #footer="{ value }"><div class="custom-footer">{{ value }}</div></template>',
    },
    global: {
      stubs: {
        DatePickerSheet: {
          props: ['modelValue'],
          emits: ['confirm'],
          template: `
            <div class="sheet">
              <button class="confirm-range" @click="$emit('confirm', { from: '2026-06-18', to: '2026-06-22' })" />
              <slot name="header" />
              <slot name="sections" />
              <slot name="footer" :value="modelValue" />
            </div>
          `,
        },
      },
    },
  });
};

test('DatePickerSheetModal renders custom sheet slots', async () => {
  const wrapper = await mountModal();

  expect(wrapper.html()).toContain('custom-header');
  expect(wrapper.html()).toContain('custom-sections');
  expect(wrapper.html()).toContain('custom-footer');
  expect(wrapper.html()).toContain('2026-06-18');
});

test('DatePickerSheetModal closes with a confirmed range selection', async () => {
  const wrapper = await mountModal();

  await wrapper.find('.confirm-range').trigger('click');

  expect(modalClose).toHaveBeenCalledWith({
    selection: { from: '2026-06-18', to: '2026-06-22' },
  });
});
