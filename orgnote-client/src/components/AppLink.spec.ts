import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import AppLink from './AppLink.vue';

const createWrapper = (props: Record<string, unknown> = {}, slots = {}) =>
  mount(AppLink, {
    props: { href: 'https://example.com', ...props },
    slots,
  });

test('AppLink renders label when no slot provided', () => {
  const wrapper = createWrapper({ label: 'Click me' });

  expect(wrapper.text()).toContain('Click me');
});

test('AppLink prefers slot over label', () => {
  const wrapper = createWrapper({ label: 'Fallback' }, { default: () => 'Slot content' });

  expect(wrapper.text()).toContain('Slot content');
  expect(wrapper.text()).not.toContain('Fallback');
});

test('AppLink sets href attribute correctly', () => {
  const wrapper = createWrapper({ href: 'https://org-note.com' });

  expect(wrapper.find('a').attributes('href')).toBe('https://org-note.com');
});

test('AppLink sets target="_blank" and rel for external links by default', () => {
  const wrapper = createWrapper();
  const link = wrapper.find('a');

  expect(link.attributes('target')).toBe('_blank');
  expect(link.attributes('rel')).toBe('noopener noreferrer');
});

test('AppLink does not set target and rel for internal links', () => {
  const wrapper = createWrapper({ href: '/settings', external: false });
  const link = wrapper.find('a');

  expect(link.attributes('target')).toBeUndefined();
  expect(link.attributes('rel')).toBeUndefined();
});

test('AppLink applies color class based on color prop', () => {
  const wrapper = createWrapper({ color: 'green' });

  expect(wrapper.find('a').classes()).toContain('color-green');
});

test('AppLink uses accent as default color', () => {
  const wrapper = createWrapper();

  expect(wrapper.find('a').classes()).toContain('color-accent');
});

test('AppLink applies underline class when underline prop is true', () => {
  const wrapper = createWrapper({ underline: true });

  expect(wrapper.find('a').classes()).toContain('underline');
});

test('AppLink does not apply underline class by default', () => {
  const wrapper = createWrapper();

  expect(wrapper.find('a').classes()).not.toContain('underline');
});
