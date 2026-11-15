import { expect, test } from 'vitest';
import type { FileMeta, FileTask } from 'orgnote-api';
import type { ClockEntry } from 'org-mode-ast';
import {
  createFocusCalendarEntries,
  extractFocusIntervals,
  selectFocusIntervals,
  type FocusInterval,
} from './focus-statistics';

const task = {
  id: 'write-notes',
  text: 'Write notes',
  start: 42,
  clocks: [
    { date: '2026-07-29T08:00:00', to: '2026-07-29T08:25:00' },
    { date: '2026-07-29T10:00:00', to: '2026-07-29T10:25:00' },
    { date: '2026-07-30T09:00:00', to: '2026-07-30T09:30:00' },
    { date: '2026-07-30T11:00:00' },
    { date: '2026-07-30T13:00:00', to: '2026-07-30T12:00:00' },
  ],
} as FileTask;

const files: readonly FileMeta[] = [
  {
    id: 'project',
    filePath: ['notes', 'project.org'],
    title: 'Project',
    tasks: [task],
  },
];

const intervals = extractFocusIntervals(files);

const extractClocks = (clocks: Pick<ClockEntry, 'date' | 'to'>[]): FocusInterval[] =>
  extractFocusIntervals([
    {
      id: 'project',
      filePath: ['notes', 'project.org'],
      title: 'Project',
      tasks: [
        {
          ...task,
          clocks: clocks.map((clock, index) => ({ ...clock, start: index, end: index + 1 })),
        },
      ],
    },
  ]);

test('focus statistics preserve every completed CLOCK interval', () => {
  expect(intervals).toHaveLength(3);
  expect(intervals.map(({ taskText }) => taskText)).toEqual([
    'Write notes',
    'Write notes',
    'Write notes',
  ]);
  expect(intervals[0]).toMatchObject({
    date: '2026-07-30',
    durationMin: 30,
    filePath: '/notes/project.org',
    fileTitle: 'Project',
    taskStart: 42,
  });
});

test('focus statistics aggregate calendar duration by local date', () => {
  expect(createFocusCalendarEntries(intervals)).toEqual(
    expect.arrayContaining([
      { date: '2026-07-29', value: 50 },
      { date: '2026-07-30', value: 30 },
    ]),
  );
});

test('focus statistics select intervals without merging repeated tasks', () => {
  expect(selectFocusIntervals(intervals, '2026-07-29')).toHaveLength(2);
});

test('focus statistics split intervals at local midnight', () => {
  const segments = extractClocks([
    { date: '2026-07-30T23:00:00', to: '2026-07-31T01:00:00' },
  ]);
  expect(createFocusCalendarEntries(segments)).toEqual(
    expect.arrayContaining([
      { date: '2026-07-30', value: 60 },
      { date: '2026-07-31', value: 60 },
    ]),
  );
  expect(selectFocusIntervals(segments, '2026-07-30')[0]).toMatchObject({
    startTime: new Date('2026-07-30T23:00:00').getTime(),
    endTime: new Date('2026-07-31T00:00:00').getTime(),
  });
  expect(selectFocusIntervals(segments, '2026-07-31')[0]).toMatchObject({
    startTime: new Date('2026-07-31T00:00:00').getTime(),
    endTime: new Date('2026-07-31T01:00:00').getTime(),
  });
});

test('focus statistics ignore semantically invalid clock dates', () => {
  expect(extractClocks([{ date: 'not-a-date', to: 'also-invalid' }])).toEqual([]);
});
