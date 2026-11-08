import { mount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { QueueTask } from 'orgnote-api';
import TaskDetailsModal from 'src/components/TaskDetailsModal.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('src/utils/clipboard', () => ({
  copyToClipboard: vi.fn(() => Promise.resolve()),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useNotifications: () => ({
        notify: vi.fn(),
      }),
    },
  },
}));

const AppCodeStub = defineComponent({
  name: 'AppCode',
  props: ['code'],
  render() {
    return h('div', { class: 'app-code-stub' }, this.code ?? '');
  },
});

const createMockTask = (overrides: Partial<QueueTask> = {}): QueueTask =>
  ({
    id: 'task-1',
    payload: { file: 'test.org' },
    queueId: 'sync',
    added: Date.now(),
    status: 'pending',
    ...overrides,
  }) as QueueTask;

const mountTaskDetails = (task: QueueTask) =>
  mount(TaskDetailsModal, {
    props: { task },
    global: {
      components: {
        AppCode: AppCodeStub,
      },
      stubs: {
        AppFlex: {
          template: '<div class="app-flex-stub"><slot /></div>',
          props: ['column', 'start', 'alignStretch', 'gap', 'row', 'align'],
        },
        CardWrapper: {
          template: '<div class="card-wrapper-stub"><slot /></div>',
          props: ['padding', 'border', 'type'],
        },
        MenuItem: {
          template: '<div class="menu-item-stub" @click="$emit(\'click\')"><slot /></div>',
          props: ['type'],
          emits: ['click'],
        },
      },
    },
  });

test('TaskDetailsModal renders formatted JSON task data in AppCode', () => {
  const task = createMockTask();
  const wrapper = mountTaskDetails(task);

  const appCode = wrapper.findComponent(AppCodeStub);
  expect(appCode.exists()).toBe(true);

  const expectedJson = JSON.stringify(task, null, 2);
  expect(appCode.props('code')).toBe(expectedJson);
});

