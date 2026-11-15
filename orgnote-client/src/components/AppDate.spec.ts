import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { defineComponent } from 'vue';
import { i18n } from 'src/boot/i18n';
import AppDate from './AppDate.vue';

const InlineDateTokenStub = defineComponent({
  props: {
    editable: {
      type: Boolean,
      default: false,
    },
    monospace: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['activate'],
  template: `
    <span
      class="app-date"
      :class="{ editable, monospace }"
      @click="$emit('activate')"
    >
      <slot />
    </span>
  `,
});

const createWrapper = (props: Record<string, unknown> = {}) =>
  mount(AppDate, {
    props: {
      date: new Date('2023-01-01T12:00:00.000Z'),
      ...props,
    },
    global: {
      plugins: [i18n],
      stubs: {
        InlineDateToken: InlineDateTokenStub,
      },
    },
  });

test('AppDate renders formatted date by default', () => {
  const wrapper = createWrapper();
  expect(wrapper.text()).not.toBe('Invalid Date');
  expect(wrapper.text().length).toBeGreaterThan(0);
});

test('AppDate renders time format', () => {
  const wrapper = createWrapper({ format: 'time' });
  expect(wrapper.text()).toMatch(/\d{1,2}:\d{2}/);
});

test('AppDate renders date format', () => {
  const wrapper = createWrapper({ format: 'date' });
  expect(wrapper.text()).toMatch(/\d{1,4}/);
});

test('AppDate renders iso format', () => {
  const wrapper = createWrapper({ format: 'iso' });
  expect(wrapper.text()).toBe('2023-01-01T12:00:00.000Z');
});

test('AppDate applies monospace class', () => {
  const wrapper = createWrapper({ monospace: true });
  expect(wrapper.find('.app-date').classes()).toContain('monospace');
});

test('AppDate handles invalid date', () => {
  const wrapper = createWrapper({ date: 'invalid-date' });
  expect(wrapper.text()).toBe('Invalid Date');
});

test('AppDate handles timestamp input', () => {
  const timestamp = 1672574400000;
  const wrapper = createWrapper({ date: timestamp, format: 'iso' });
  expect(wrapper.text()).toBe('2023-01-01T12:00:00.000Z');
});

test('AppDate emits open when editable and clicked', async () => {
  const wrapper = createWrapper({ editable: true });
  await wrapper.find('.app-date').trigger('click');
  expect(wrapper.emitted('open')).toEqual([[]]);
});
