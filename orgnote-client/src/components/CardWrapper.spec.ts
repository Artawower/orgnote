import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import CardWrapper from './CardWrapper.vue';

test('CardWrapper renders slot content with the plain variant by default', () => {
  const wrapper = mount(CardWrapper, {
    slots: { default: '<div class="content">Card content</div>' },
  });

  expect(wrapper.get('.content').text()).toBe('Card content');
  expect(wrapper.classes()).toEqual(expect.arrayContaining(['card-wrapper', 'plain']));
});

test('CardWrapper omits padding and border states by default', () => {
  const wrapper = mount(CardWrapper);

  expect(wrapper.classes()).not.toContain('padding');
  expect(wrapper.classes()).not.toContain('border');
});

test('CardWrapper applies padding, border and visual variant states', () => {
  const wrapper = mount(CardWrapper, {
    props: {
      padding: true,
      border: true,
      type: 'info',
    },
  });

  expect(wrapper.classes()).toEqual(expect.arrayContaining(['padding', 'border', 'info']));
  expect(wrapper.classes()).not.toContain('plain');
});

test('CardWrapper exposes the clear visual variant', () => {
  const wrapper = mount(CardWrapper, { props: { type: 'clear' } });

  expect(wrapper.classes()).toContain('clear');
});

test('CardWrapper preserves multiple direct children', () => {
  const wrapper = mount(CardWrapper, {
    slots: {
      default: '<div class="first">First</div><div class="second">Second</div>',
    },
  });

  expect(wrapper.get('.card-wrapper').element.children).toHaveLength(2);
  expect(wrapper.get('.first').text()).toBe('First');
  expect(wrapper.get('.second').text()).toBe('Second');
});
