import { expect, test } from 'vitest';
import type { FileMeta } from 'orgnote-api';
import type { OrgRepeater } from 'org-mode-ast';
import type { AgendaFilter } from '../models/agenda-task-query';
import {
  buildAgendaTaskBufferUri,
  parseAgendaTaskBufferUri,
} from '../utils/agenda-task-buffer-uri';
import { buildAgendaTaskGroups } from './use-agenda-tasks';

type FileTask = NonNullable<FileMeta['tasks']>[number];

const NOW = new Date('2026-05-12T12:00:00');
const DAILY_REPEATER: OrgRepeater = { type: '+', value: 1, unit: 'd' };

const scheduledTask = (
  id: string,
  date: string,
  repeater?: OrgRepeater,
): FileTask => ({
  id,
  kind: 'headline-todo',
  state: 'todo',
  text: id,
  scheduled: {
    date,
    active: true,
    hasTime: false,
    start: 0,
    end: 0,
    repeater,
  },
});

const agendaFiles = (tasks: FileTask[]): FileMeta[] => [
  {
    id: 'work',
    filePath: ['agenda', 'work.org'],
    title: 'Work',
    tasks,
  },
];

const concretePresetFilter = (preset: AgendaFilter) => {
  const uri = buildAgendaTaskBufferUri({ kind: 'preset', value: preset }, NOW);
  const filter = parseAgendaTaskBufferUri(uri);
  if (!filter) throw new TypeError(`Unable to parse Agenda buffer URI: ${uri}`);
  return filter;
};

test('concrete Today buffer preserves overdue carryover tasks', () => {
  const groups = buildAgendaTaskGroups(
    agendaFiles([
      scheduledTask('overdue', '2026-05-11'),
      scheduledTask('today', '2026-05-12'),
      scheduledTask('future', '2026-05-13'),
    ]),
    { dateFilter: concretePresetFilter('today') },
    NOW,
  );

  expect(groups[0]?.tasks.map(({ id }) => id)).toEqual(['overdue', 'today']);
  expect(groups[0]?.tasks[0]?.viewDate).toEqual(new Date('2026-05-12T00:00:00'));
});

test('concrete Today buffer remains anchored to its encoded local date', () => {
  const groups = buildAgendaTaskGroups(
    agendaFiles([scheduledTask('overdue', '2026-05-11')]),
    { dateFilter: concretePresetFilter('today') },
    new Date('2026-05-13T12:00:00'),
  );

  expect(groups[0]?.tasks[0]?.viewDate).toEqual(new Date('2026-05-12T00:00:00'));
});

test('concrete Next 7 Days buffer preserves overdue carryover tasks', () => {
  const groups = buildAgendaTaskGroups(
    agendaFiles([
      scheduledTask('overdue', '2026-05-11'),
      scheduledTask('in-range', '2026-05-18'),
      scheduledTask('later', '2026-05-20'),
    ]),
    { dateFilter: concretePresetFilter('next7days') },
    NOW,
  );

  expect(groups[0]?.tasks.map(({ id }) => id)).toEqual(['overdue', 'in-range']);
  expect(groups[0]?.tasks[0]?.viewDate).toEqual(new Date('2026-05-12T00:00:00'));
});

test('custom Today date selection remains exact', () => {
  const groups = buildAgendaTaskGroups(
    agendaFiles([
      scheduledTask('overdue', '2026-05-11'),
      scheduledTask('today', '2026-05-12'),
    ]),
    { dateFilter: { kind: 'day', value: '2026-05-12' } },
    NOW,
  );

  expect(groups[0]?.tasks.map(({ id }) => id)).toEqual(['today']);
});

test('concrete Tomorrow buffer preserves the next unfinished recurring occurrence', () => {
  const recurringTask = {
    ...scheduledTask('daily', '2026-05-12', DAILY_REPEATER),
    doneDates: ['2026-05-12'],
  };
  const groups = buildAgendaTaskGroups(
    agendaFiles([recurringTask]),
    { dateFilter: concretePresetFilter('tomorrow') },
    NOW,
  );

  expect(groups[0]?.tasks.map(({ id }) => id)).toEqual(['daily']);
  expect(groups[0]?.tasks[0]?.viewDate).toEqual(new Date('2026-05-13T00:00:00'));
});
