import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import AppGrid from './AppGrid.vue';

const createWrapper = (
  props: Record<string, unknown> = {},
  slots = { default: '<div>Item 1</div><div>Item 2</div>' },
) =>
  mount(AppGrid, {
    props,
    slots,
  });

test('AppGrid renders slot content', () => {
  const wrapper = createWrapper();
  expect(wrapper.text()).toContain('Item 1');
  expect(wrapper.text()).toContain('Item 2');
});

test('AppGrid applies default styles', () => {
  const wrapper = createWrapper();
  const style = wrapper.find('.app-grid').attributes('style');
  expect(style).toContain('--grid-gap: var(--gap-md)');
  expect(style).toContain('--grid-cols-base: repeat(1, minmax(0, 1fr))');
});

test('AppGrid applies cols prop', () => {
  const wrapper = createWrapper({ cols: 3 });
  const style = wrapper.find('.app-grid').attributes('style');
  expect(style).toContain('--grid-cols-base: repeat(3, minmax(0, 1fr))');
});

test('AppGrid applies responsive cols', () => {
  const wrapper = createWrapper({
    responsive: {
      tablet: 2,
      desktop: 4,
    },
  });
  const style = wrapper.find('.app-grid').attributes('style');
  expect(style).toContain('--grid-cols-tablet: repeat(2, minmax(0, 1fr))');
  expect(style).toContain('--grid-cols-desktop: repeat(4, minmax(0, 1fr))');
});

test('AppGrid generates layout CSS', () => {
  const wrapper = createWrapper({
    layout: [{ span: 2 }, { col: 2, row: 1 }],
  });
  const styleTag = wrapper.find('style');
  expect(styleTag.exists()).toBe(true);
  const css = styleTag.text();
  expect(css).toContain('grid-column: span 2');
  expect(css).toContain('grid-column-start: 2');
  expect(css).toContain('grid-row-start: 1');
});

test('AppGrid generates responsive layout CSS', () => {
  const wrapper = createWrapper({
    layout: [{ span: 1, tablet: { span: 2 } }],
  });
  const css = wrapper.find('style').text();
  expect(css).toContain('grid-column: span 1');
  expect(css).toContain('@media (min-width: 768px)');
  expect(css).toContain('grid-column: span 2');
});
