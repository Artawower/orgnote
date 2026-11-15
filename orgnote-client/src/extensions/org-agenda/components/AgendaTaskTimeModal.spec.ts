import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import TimeRangeInput from 'src/components/TimeRangeInput.vue';

const closeModal = vi.fn();

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useModal: () => ({ close: closeModal }),
    },
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));
  closeModal.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

test('task time modal accepts a duration selected with the wheel picker', async () => {
  const { default: AgendaTaskTimeModal } = await import('./AgendaTaskTimeModal.vue');
  const wrapper = mount(AgendaTaskTimeModal);

  wrapper.findComponent(TimeRangeInput).vm.$emit('update:duration', { hours: 1, minutes: 30 });
  await nextTick();
  await wrapper.find('.add-time').trigger('click');

  expect(closeModal).toHaveBeenCalledWith({ hours: 1, minutes: 30 });
});

test('task time modal accepts an optional wheel-picked start time', async () => {
  const { default: AgendaTaskTimeModal } = await import('./AgendaTaskTimeModal.vue');
  const wrapper = mount(AgendaTaskTimeModal);
  const rangeInput = wrapper.findComponent(TimeRangeInput);

  rangeInput.vm.$emit('update:duration', { hours: 1, minutes: 30 });
  rangeInput.vm.$emit('update:startTime', { hours: 8, minutes: 15 });
  await nextTick();

  expect(wrapper.text()).toContain('09:45');
  await wrapper.find('.add-time').trigger('click');
  expect(closeModal).toHaveBeenCalledWith({ hours: 1, minutes: 30, startTime: '08:15' });
});

test('task time modal accepts a previous-day interval after midnight', async () => {
  vi.setSystemTime(new Date(2026, 4, 15, 0, 30));
  const { default: AgendaTaskTimeModal } = await import('./AgendaTaskTimeModal.vue');
  const wrapper = mount(AgendaTaskTimeModal);
  const rangeInput = wrapper.findComponent(TimeRangeInput);

  rangeInput.vm.$emit('update:duration', { hours: 1, minutes: 0 });
  rangeInput.vm.$emit('update:startTime', { hours: 23, minutes: 0 });
  await nextTick();
  await wrapper.find('.add-time').trigger('click');

  expect(closeModal).toHaveBeenCalledWith({ hours: 1, minutes: 0, startTime: '23:00' });
});

test('task time modal rejects ranges ending in the future', async () => {
  const { default: AgendaTaskTimeModal } = await import('./AgendaTaskTimeModal.vue');
  const wrapper = mount(AgendaTaskTimeModal);
  const rangeInput = wrapper.findComponent(TimeRangeInput);

  rangeInput.vm.$emit('update:duration', { hours: 1, minutes: 30 });
  rangeInput.vm.$emit('update:startTime', { hours: 11, minutes: 0 });
  await nextTick();
  await wrapper.find('.add-time').trigger('click');

  expect(closeModal).not.toHaveBeenCalled();
});

test('task time modal rejects a zero duration', async () => {
  const { default: AgendaTaskTimeModal } = await import('./AgendaTaskTimeModal.vue');
  const wrapper = mount(AgendaTaskTimeModal);

  await wrapper.find('.add-time').trigger('click');

  expect(closeModal).not.toHaveBeenCalled();
});
