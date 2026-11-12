import { mount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import CompletionResultDefaultItem from './CompletionResultDefaultItem.vue';

const mountComponent = () =>
  mount(CompletionResultDefaultItem, {
    props: {
      candidate: {
        title: 'Command title',
        description: 'Command description',
        icon: 'sym_o_terminal',
        data: {},
        commandHandler: vi.fn(),
      } as const,
      index: 0,
      selected: false,
      searchQuery: '',
      onSelect: vi.fn(),
    },
    global: {
      stubs: {
        AppFlex: {
          template: '<div><slot /></div>',
        },
        AppIcon: true,
      },
    },
  });

test('CompletionResultDefaultItem renders title and description content', () => {
  const wrapper = mountComponent();

  expect(wrapper.text()).toContain('Command title');
  expect(wrapper.text()).toContain('Command description');
  expect(wrapper.find('.title-content').exists()).toBe(true);
  expect(wrapper.find('.description-content').exists()).toBe(true);
});
