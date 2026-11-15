import { beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import AgendaQuickAddContainer from './AgendaQuickAddContainer.vue';
import { useAgendaFilterStore } from '../stores/agenda-filter-store';

const mocks = vi.hoisted(() => ({
  selectTargetFile: undefined as ((filePath: string) => void) | undefined,
  resolveQuickAddDate: vi.fn(() => '2026-07-23'),
  setTargetFileAndFocus: vi.fn(),
  submitQuickAdd: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('src/boot/api', () => ({
  api: { core: { useCommands: () => ({}) } },
}));

vi.mock('../commands/quick-add-to-file-command', () => ({
  subscribeToQuickAddToFileCommand: (
    _commands: unknown,
    selectTargetFile: (filePath: string) => void,
  ) => {
    mocks.selectTargetFile = selectTargetFile;
    return mocks.unsubscribe;
  },
}));

vi.mock('../composables/use-agenda-quick-add-submit', () => ({
  useAgendaQuickAddSubmit: () => ({
    agendaConfig: { agendaFilesPath: '/agenda' },
    knownOrgFiles: [],
    quickAddLoading: false,
    resolvedInboxPath: '/agenda/inbox.org',
    submitQuickAdd: mocks.submitQuickAdd,
  }),
}));

vi.mock('../utils/agenda-date-selection', () => ({
  resolveAgendaQuickAddDate: mocks.resolveQuickAddDate,
}));

const AgendaQuickAddStub = defineComponent({
  name: 'AgendaQuickAdd',
  props: { defaultTargetFile: String },
  setup: (_, { expose }) => {
    expose({ setTargetFileAndFocus: mocks.setTargetFileAndFocus });
    return () => h('div');
  },
});

beforeEach(() => {
  setActivePinia(createPinia());
  mocks.selectTargetFile = undefined;
  vi.clearAllMocks();
});

test('AgendaQuickAddContainer derives the default date from its buffer filter', () => {
  const dateFilter = { kind: 'day', value: '2026-07-23' } as const;

  mount(AgendaQuickAddContainer, {
    props: { dateFilter },
    global: { stubs: { AgendaQuickAdd: AgendaQuickAddStub } },
  });

  expect(mocks.resolveQuickAddDate).toHaveBeenCalledWith(dateFilter);
});

test('AgendaQuickAddContainer follows the selected file filter', async () => {
  const filterStore = useAgendaFilterStore();
  filterStore.setFileFilter('/agenda/work.org');
  const wrapper = mount(AgendaQuickAddContainer, {
    props: { dateFilter: { kind: 'preset', value: 'all' } },
    global: { stubs: { AgendaQuickAdd: AgendaQuickAddStub } },
  });

  expect(wrapper.getComponent(AgendaQuickAddStub).props('defaultTargetFile')).toBe(
    '/agenda/work.org',
  );

  filterStore.setFileFilter();
  await nextTick();

  expect(wrapper.getComponent(AgendaQuickAddStub).props('defaultTargetFile')).toBeUndefined();
});

test('AgendaQuickAddContainer applies command targets to the input', async () => {
  mount(AgendaQuickAddContainer, {
    props: { dateFilter: { kind: 'preset', value: 'all' } },
    global: { stubs: { AgendaQuickAdd: AgendaQuickAddStub } },
  });

  mocks.selectTargetFile?.('/agenda/work.org');
  await nextTick();

  expect(mocks.setTargetFileAndFocus).toHaveBeenCalledWith('/agenda/work.org');
});

test('AgendaQuickAddContainer unsubscribes from commands when unmounted', () => {
  const wrapper = mount(AgendaQuickAddContainer, {
    props: { dateFilter: { kind: 'preset', value: 'all' } },
    global: { stubs: { AgendaQuickAdd: AgendaQuickAddStub } },
  });

  wrapper.unmount();

  expect(mocks.unsubscribe).toHaveBeenCalledOnce();
});
