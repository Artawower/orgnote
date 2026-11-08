import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { expect, test, vi } from 'vitest';
import type { AgendaFocusRecordGroup, AgendaFocusRecordItem } from './agenda-focus-record-types';
import type { FocusInterval } from '../utils/focus-statistics';

const navigation = vi.hoisted(() => ({ openNoteAtPosition: vi.fn(() => Promise.resolve()) }));

vi.mock('src/boot/api', () => ({ api: {} }));
vi.mock('src/boot/report', () => ({ reporter: { reportError: vi.fn() } }));
vi.mock('src/utils/editor-navigation', () => navigation);

import AgendaFocusRecord from './AgendaFocusRecord.vue';

const AgendaFocusRecordListStub = defineComponent({
  name: 'AgendaFocusRecordList',
  props: { groups: Array },
  emits: ['select-record'],
  template: '<div />',
});

const intervals: readonly FocusInterval[] = [
  {
    date: '2026-07-29',
    durationMin: 25,
    endTime: new Date('2026-07-29T10:25:00').getTime(),
    filePath: '/notes/project.org',
    fileTitle: 'Project',
    startTime: new Date('2026-07-29T10:00:00').getTime(),
    taskStart: 42,
    taskText: 'Write notes',
  },
  {
    date: '2026-07-29',
    durationMin: 25,
    endTime: new Date('2026-07-29T08:25:00').getTime(),
    filePath: '/notes/project.org',
    fileTitle: 'Project',
    startTime: new Date('2026-07-29T08:00:00').getTime(),
    taskStart: 42,
    taskText: 'Write notes',
  },
];

const mountFocusRecord = () =>
  mount(AgendaFocusRecord, {
    props: { intervals },
    global: { stubs: { AgendaFocusRecordList: AgendaFocusRecordListStub } },
  });

test('focus records are grouped by file without merging repeated task intervals', () => {
  const wrapper = mountFocusRecord();
  const groups = wrapper.getComponent(AgendaFocusRecordListStub).props(
    'groups',
  ) as AgendaFocusRecordGroup[];
  expect(groups).toHaveLength(1);
  expect(groups[0]).toMatchObject({ filePath: '/notes/project.org', fileTitle: 'Project' });
  expect(groups[0]?.records).toHaveLength(2);
  expect(groups[0]?.records.map(({ taskText }) => taskText)).toEqual(['Write notes', 'Write notes']);
});

test('focus record opens the selected source task', async () => {
  const wrapper = mountFocusRecord();
  const list = wrapper.getComponent(AgendaFocusRecordListStub);
  const record = (list.props('groups') as AgendaFocusRecordGroup[])[0]
    ?.records[0] as AgendaFocusRecordItem;
  list.vm.$emit('select-record', record, '/notes/project.org');
  await vi.waitFor(() => {
    expect(navigation.openNoteAtPosition).toHaveBeenCalledWith({}, '/notes/project.org', 42);
  });
});
