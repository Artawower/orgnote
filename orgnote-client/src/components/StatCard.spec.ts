import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import StatCard from './StatCard.vue';

const createWrapper = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) =>
  mount(StatCard, {
    props,
    slots,
    global: {
      stubs: {
        CardWrapper: {
          template: '<div class="card-wrapper"><slot /></div>',
        },
      },
    },
  });

test('StatCard renders label and value from props', () => {
  const wrapper = createWrapper({ label: 'Total Tasks', value: 42 });
  expect(wrapper.text()).toContain('Total Tasks');
  expect(wrapper.text()).toContain('42');
});

test('StatCard renders slots content', () => {
  const wrapper = createWrapper(
    {},
    {
      label: '<span class="custom-label">Custom Label</span>',
      value: '<span class="custom-value">100</span>',
    },
  );
  expect(wrapper.find('.custom-label').exists()).toBe(true);
  expect(wrapper.find('.custom-value').exists()).toBe(true);
  expect(wrapper.text()).toContain('Custom Label');
  expect(wrapper.text()).toContain('100');
});

test('StatCard renders value as 0 correctly', () => {
  const wrapper = createWrapper({ label: 'Zero', value: 0 });
  expect(wrapper.text()).toContain('0');
});
