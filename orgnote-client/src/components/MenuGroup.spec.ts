import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import MenuGroup from './MenuGroup.vue';

test('MenuGroup renders menu rows without a title by default', () => {
  const wrapper = mount(MenuGroup, {
    slots: { default: '<div class="menu-row">Preferences</div>' },
  });

  expect(wrapper.attributes('role')).toBe('group');
  expect(wrapper.find('.menu-group-title').exists()).toBe(false);
  expect(wrapper.get('.menu-row').text()).toBe('Preferences');
});

test('MenuGroup associates its title with the group', () => {
  const wrapper = mount(MenuGroup, {
    props: { title: 'Account' },
  });
  const title = wrapper.get('.menu-group-title');

  expect(title.text()).toBe('Account');
  expect(title.attributes('id')).toBeTruthy();
  expect(wrapper.attributes('aria-labelledby')).toBe(title.attributes('id'));
});

test('MenuGroup renders a custom title slot', () => {
  const wrapper = mount(MenuGroup, {
    props: { title: 'Fallback title' },
    slots: { title: '<span class="custom-title">Custom title</span>' },
  });

  expect(wrapper.get('.custom-title').text()).toBe('Custom title');
  expect(wrapper.text()).not.toContain('Fallback title');
});

test('MenuGroup preserves multiple menu rows in its items container', () => {
  const wrapper = mount(MenuGroup, {
    slots: {
      default: '<div class="first-row">First</div><div class="second-row">Second</div>',
    },
  });

  expect(wrapper.get('.menu-group-items').element.children).toHaveLength(2);
  expect(wrapper.get('.first-row').text()).toBe('First');
  expect(wrapper.get('.second-row').text()).toBe('Second');
});
