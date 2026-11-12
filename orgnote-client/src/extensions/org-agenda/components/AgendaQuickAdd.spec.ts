import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import type * as VueI18n from 'vue-i18n';
import AgendaQuickAdd from './AgendaQuickAdd.vue';

vi.mock('vue-i18n', async () => ({
  ...((await vi.importActual('vue-i18n')) as typeof VueI18n),
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCompletion: () => ({ open: vi.fn() }),
    },
    ui: {
      useScreenDetection: () => ({ tabletBelow: ref(false) }),
    },
  },
}));

vi.mock('../composables/use-agenda-mini-editor', () => ({
  useAgendaMiniEditor: () => ({ openCreate: vi.fn() }),
}));

const focusTitle = vi.fn();

const AgendaTaskFormStub = defineComponent({
  name: 'AgendaTaskForm',
  props: ['title'],
  emits: ['update:title', 'submit'],
  setup: (_, { slots, expose }) => {
    expose({ focusTitle, focusBody: vi.fn(), blurTitle: vi.fn() });
    return () =>
      h('div', [
        slots['before-title']?.(),
        slots['title-actions']?.(),
        slots['toolbar-start']?.(),
      ]);
  },
});

const AppBadgeStub = defineComponent({
  name: 'AppBadge',
  props: { label: String },
  template: '<button>{{ label }}</button>',
});

const AgendaScheduleButtonStub = defineComponent({
  name: 'AgendaScheduleButton',
  setup: () => () => h('button'),
});

const mountQuickAdd = (habitMode = false, defaultTargetFile?: string) =>
  mount(AgendaQuickAdd, {
    props: {
      agendaFilesPath: '/agenda',
      inboxFilePath: '/agenda/inbox.org',
      defaultDate: '2026-06-10',
      defaultTargetFile,
      habitMode,
    },
    global: {
      stubs: {
        CardWrapper: { template: '<div><slot /></div>' },
        AgendaTaskForm: AgendaTaskFormStub,
        AgendaScheduleButton: AgendaScheduleButtonStub,
        AppBadge: AppBadgeStub,
        ActionButton: true,
      },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

test('AgendaQuickAdd inherits the filter date without rendering a task date picker', async () => {
  const wrapper = mountQuickAdd();
  const form = wrapper.findComponent(AgendaTaskFormStub);

  await form.vm.$emit('update:title', 'Plan release');
  await form.vm.$emit('submit');

  expect(wrapper.findComponent(AgendaScheduleButtonStub).exists()).toBe(false);
  expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual(
    expect.objectContaining({
      title: 'Plan release',
      scheduled: { date: '2026-06-10' },
    }),
  );
});

test('AgendaQuickAdd follows the default target without moving focus', () => {
  const wrapper = mountQuickAdd(false, '/agenda/work.org');

  expect(wrapper.getComponent(AppBadgeStub).props('label')).toBe('work');
  expect(focusTitle).not.toHaveBeenCalled();
});

test('AgendaQuickAdd selects a requested file and focuses the title input', async () => {
  const wrapper = mountQuickAdd();

  const quickAdd = wrapper.vm as unknown as {
    setTargetFileAndFocus: (filePath: string) => void;
  };
  quickAdd.setTargetFileAndFocus('/agenda/work.org');
  await nextTick();

  expect(wrapper.getComponent(AppBadgeStub).props('label')).toBe('work');
  expect(focusTitle).toHaveBeenCalledOnce();
});

test('AgendaQuickAdd keeps schedule controls for habit creation', () => {
  const wrapper = mountQuickAdd(true);

  expect(wrapper.findComponent(AgendaScheduleButtonStub).exists()).toBe(true);
});
