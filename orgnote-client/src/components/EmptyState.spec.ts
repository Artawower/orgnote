import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import EmptyState from './EmptyState.vue';

const createWrapper = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) =>
  mount(EmptyState, {
    props,
    slots,
    global: {
      stubs: {
        CardWrapper: {
          template: '<div class="card-wrapper"><slot /></div>',
        },
        AppIcon: {
          template: '<div class="app-icon" :class="name"></div>',
          props: ['name', 'size'],
        },
        AppFlex: {
          template: '<div class="app-flex"><slot /></div>',
        },
      },
    },
  });

test('EmptyState renders title and description', () => {
  const wrapper = createWrapper({
    title: 'No Items',
    description: 'Add some items to get started',
  });
  expect(wrapper.text()).toContain('No Items');
  expect(wrapper.text()).toContain('Add some items to get started');
});

test('EmptyState renders icon when provided', () => {
  const wrapper = createWrapper({ icon: 'sym_o_inbox' });
  const icon = wrapper.find('.app-icon');
  expect(icon.exists()).toBe(true);
  expect(icon.classes()).toContain('sym_o_inbox');
});

test('EmptyState renders slot content', () => {
  const wrapper = createWrapper({}, { default: '<button>Action</button>' });
  expect(wrapper.find('button').exists()).toBe(true);
  expect(wrapper.text()).toContain('Action');
});

test('EmptyState does not render elements if props are missing', () => {
  const wrapper = createWrapper();
  expect(wrapper.find('.title').exists()).toBe(false);
  expect(wrapper.find('.description').exists()).toBe(false);
  expect(wrapper.find('.app-icon').exists()).toBe(false);
});
