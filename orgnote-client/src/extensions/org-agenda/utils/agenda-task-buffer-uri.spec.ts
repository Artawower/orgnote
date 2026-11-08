import { afterEach, expect, test, vi } from 'vitest';
import { AGENDA_TASKS_PATTERN } from '../constants';
import {
  buildAgendaTaskBufferUri,
  parseAgendaTaskBufferUri,
  resolveAgendaPresetFilter,
  resolveAgendaTaskBufferPreset,
} from './agenda-task-buffer-uri';

afterEach(() => {
  vi.useRealTimers();
});

test('Today resolves to a concrete local day buffer', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));

  const filter = resolveAgendaPresetFilter('today');

  expect(filter).toEqual({
    kind: 'day',
    value: '2026-05-14',
    relativePreset: 'today',
  });
  expect(buildAgendaTaskBufferUri(filter)).toBe(
    'builtin:///agenda-tasks/day/2026-05-14/today',
  );
});

test('Tomorrow resolves to a different concrete day buffer', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));

  const filter = resolveAgendaPresetFilter('tomorrow');

  expect(filter).toEqual({
    kind: 'day',
    value: '2026-05-15',
    relativePreset: 'tomorrow',
  });
  expect(buildAgendaTaskBufferUri(filter)).toBe(
    'builtin:///agenda-tasks/day/2026-05-15/tomorrow',
  );
});

test('Next 7 days resolves to a concrete range buffer', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));

  const filter = resolveAgendaPresetFilter('next7days');

  expect(filter).toEqual({
    kind: 'range',
    from: '2026-05-14',
    to: '2026-05-21',
    relativePreset: 'next7days',
  });
  expect(buildAgendaTaskBufferUri(filter)).toBe(
    'builtin:///agenda-tasks/range/2026-05-14/2026-05-21/next7days',
  );
});

test('Overdue and All keep stable preset buffer identities', () => {
  expect(buildAgendaTaskBufferUri({ kind: 'preset', value: 'overdue' })).toBe(
    'builtin:///agenda-tasks/preset/overdue',
  );
  expect(buildAgendaTaskBufferUri({ kind: 'preset', value: 'all' })).toBe(
    'builtin:///agenda-tasks/preset/all',
  );
});

test('Agenda task buffer URI restores its date filter', () => {
  expect(parseAgendaTaskBufferUri('builtin:///agenda-tasks/day/2026-05-18')).toEqual({
    kind: 'day',
    value: '2026-05-18',
  });
  expect(
    parseAgendaTaskBufferUri('builtin:///agenda-tasks/range/2026-05-14/2026-05-18'),
  ).toEqual({ kind: 'range', from: '2026-05-14', to: '2026-05-18' });
  expect(parseAgendaTaskBufferUri('builtin:///agenda-tasks/day/2026-05-18/today')).toEqual({
    kind: 'day',
    value: '2026-05-18',
    relativePreset: 'today',
  });
  expect(
    parseAgendaTaskBufferUri(
      'builtin:///agenda-tasks/range/2026-05-14/2026-05-21/next7days',
    ),
  ).toEqual({
    kind: 'range',
    from: '2026-05-14',
    to: '2026-05-21',
    relativePreset: 'next7days',
  });
});

test('Agenda task buffer URI rejects malformed dates safely', () => {
  expect(parseAgendaTaskBufferUri('builtin:///agenda-tasks/day/2026-02-31')).toBeUndefined();
  expect(
    parseAgendaTaskBufferUri(
      'builtin:///agenda-tasks/range/2026-05-14/2026-05-18/next7days',
    ),
  ).toBeUndefined();
});

test('Legacy Agenda task URI maps to All', () => {
  expect(parseAgendaTaskBufferUri('builtin:///agenda-tasks')).toEqual({
    kind: 'preset',
    value: 'all',
  });
});

test('Agenda task viewer pattern accepts supported scoped paths only', () => {
  const pattern = new RegExp(AGENDA_TASKS_PATTERN);

  expect(pattern.test('/agenda-tasks/day/2026-05-14')).toBe(true);
  expect(pattern.test('/agenda-tasks/day/2026-05-14/today')).toBe(true);
  expect(pattern.test('/agenda-tasks/day/2026-05-15/tomorrow')).toBe(true);
  expect(pattern.test('/agenda-tasks/range/2026-05-14/2026-05-18')).toBe(true);
  expect(pattern.test('/agenda-tasks/range/2026-05-14/2026-05-21/next7days')).toBe(true);
  expect(pattern.test('/agenda-tasks/preset/overdue')).toBe(true);
  expect(pattern.test('/agenda-tasks/day/not-a-date')).toBe(false);
});

test('Agenda task buffer resolves the matching sidebar preset', () => {
  const now = new Date('2026-05-14T12:00:00');

  expect(resolveAgendaTaskBufferPreset('builtin:///agenda-tasks/day/2026-05-14', now)).toBe(
    'today',
  );
  expect(resolveAgendaTaskBufferPreset('builtin:///agenda-tasks/day/2026-05-15', now)).toBe(
    'tomorrow',
  );
  expect(
    resolveAgendaTaskBufferPreset(
      'builtin:///agenda-tasks/range/2026-05-14/2026-05-21',
      now,
    ),
  ).toBe('next7days');
  expect(resolveAgendaTaskBufferPreset('builtin:///agenda-tasks/preset/overdue', now)).toBe(
    'overdue',
  );
});

test('Non-Agenda and custom day buffers do not activate a sidebar preset', () => {
  const now = new Date('2026-05-14T12:00:00');

  expect(resolveAgendaTaskBufferPreset('builtin:///agenda-habits', now)).toBeUndefined();
  expect(
    resolveAgendaTaskBufferPreset('builtin:///agenda-tasks/day/2026-05-20', now),
  ).toBeUndefined();
});
