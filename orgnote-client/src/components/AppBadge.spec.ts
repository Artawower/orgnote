import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import AppBadge from './AppBadge.vue';
import AppIcon from './AppIcon.vue';

const createWrapper = (props: Record<string, unknown> = {}, slots = {}) =>
  mount(AppBadge, {
    props,
    slots,
  });

test('AppBadge renders label when no slot provided', () => {
  const wrapper = createWrapper({ label: 'Hello' });

  expect(wrapper.text()).toContain('Hello');
});

test('AppBadge prefers slot over label', () => {
  const wrapper = createWrapper({ label: 'Fallback' }, { default: () => 'Slot text' });

  expect(wrapper.text()).toContain('Slot text');
  expect(wrapper.text()).not.toContain('Fallback');
});

test('AppBadge applies variant, size, rounded and outline classes', () => {
  const wrapper = createWrapper({ variant: 'danger', size: 'lg', rounded: true, outline: true });
  const classes = wrapper.find('.app-badge').classes();

  expect(classes).toContain('danger');
  expect(classes).toContain('size-lg');
  expect(classes).toContain('rounded');
  expect(classes).toContain('outline');
});

test('AppBadge applies custom color variable', () => {
  const wrapper = createWrapper({ label: 'Custom', color: 'accent' });
  const style = wrapper.find('.app-badge').attributes('style');

  expect(style).toBeDefined();
  expect(style).toContain('--badge-color: var(--accent)');
});

test('AppBadge passes mapped icon size to AppIcon', () => {
  const wrapper = createWrapper({ icon: 'check', size: 'lg' });
  const icon = wrapper.findComponent(AppIcon);

  expect(icon.exists()).toBe(true);
  expect(icon.props('size')).toBe('md');
});
