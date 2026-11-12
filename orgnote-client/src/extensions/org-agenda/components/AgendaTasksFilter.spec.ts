import { expect, test, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import AgendaTasksFilter from './AgendaTasksFilter.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('src/boot/api', async () => {
  const { reactive, ref } = await import('vue');
  const pane = reactive({ activeBufferUri: ref('/agenda/tasks.org') });
  return { api: { core: { usePane: () => pane } } };
});

const AppSpoilerStub = defineComponent({
  name: 'AppSpoiler',
  template: '<section><slot name="body" /></section>',
});

const AppVirtualListStub = defineComponent({
  name: 'AppVirtualList',
  props: {
    items: { type: Array, required: true },
    itemSize: Number,
    itemKey: Function,
  },
  template: '<div />',
});

const totals = {
  overdue: 0,
  today: 0,
  tomorrow: 0,
  next7days: 0,
  all: 0,
} as const;

test('AgendaTasksFilter virtualizes the complete file filter list', () => {
  const files = Array.from({ length: 500 }, (_, index) => ({
    fileTitle: `File ${index}`,
    filePath: `/agenda/file-${index}.org`,
    taskCount: index + 1,
  }));
  const wrapper = mount(AgendaTasksFilter, {
    props: { totals, files },
    global: {
      stubs: {
        AppSpoiler: AppSpoilerStub,
        AppVirtualList: AppVirtualListStub,
      },
    },
  });

  const virtualScroll = wrapper.getComponent(AppVirtualListStub);
  expect(virtualScroll.props('items')).toHaveLength(501);
  expect(virtualScroll.props('items')[0]).toEqual({ kind: 'all', key: 'all' });
  expect(virtualScroll.props('itemSize')).toBe(36);
  expect(virtualScroll.props('itemKey')?.({ kind: 'all', key: 'all' }, 0)).toBe('all');
});
