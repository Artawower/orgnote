import { mount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import MenuItem from './MenuItem.vue';

test('MenuItem renders its default slot as an interactive menu row', () => {
  const wrapper = mount(MenuItem, {
    slots: { default: '<span class="label">Preferences</span>' },
  });

  expect(wrapper.get('.label').text()).toBe('Preferences');
  expect(wrapper.attributes('role')).toBe('button');
});

test('MenuItem applies its default visual contract classes', () => {
  const wrapper = mount(MenuItem);

  expect(wrapper.classes()).toEqual(
    expect.arrayContaining(['menu-item', 'plain', 'prefer-left', 'size-auto']),
  );
  expect(wrapper.classes()).not.toContain('active');
  expect(wrapper.classes()).not.toContain('disabled');
});

test('MenuItem exposes active, disabled, size and preference states', () => {
  const wrapper = mount(MenuItem, {
    props: {
      active: true,
      disabled: true,
      prefer: 'right',
      size: 'lg',
    },
  });

  expect(wrapper.classes()).toEqual(
    expect.arrayContaining(['active', 'disabled', 'prefer-right', 'size-lg']),
  );
  expect(wrapper.attributes('aria-disabled')).toBe('true');
});

test('MenuItem renders right and expandable content slots', () => {
  const wrapper = mount(MenuItem, {
    slots: {
      right: '<span class="shortcut">⌘K</span>',
      content: '<div class="details">Additional details</div>',
    },
  });

  expect(wrapper.get('.shortcut').text()).toBe('⌘K');
  expect(wrapper.get('.details').text()).toBe('Additional details');
});

test('MenuItem forwards click interaction from its root', async () => {
  const onClick = vi.fn();
  const wrapper = mount(MenuItem, { attrs: { onClick } });

  await wrapper.trigger('click');

  expect(onClick).toHaveBeenCalledOnce();
});
