import { expect, test } from 'vitest';
import {
  createAgendaDateFilter,
  resolveAgendaDateSelection,
  resolveAgendaQuickAddDate,
} from './agenda-date-selection';

test('createAgendaDateFilter restores Today semantics for the current local day', () => {
  expect(createAgendaDateFilter('2026-05-18', '2026-05-18')).toEqual({
    kind: 'preset',
    value: 'today',
  });
});

test('createAgendaDateFilter preserves another day as an exact selection', () => {
  expect(createAgendaDateFilter('2026-05-20', '2026-05-18')).toEqual({
    kind: 'day',
    value: '2026-05-20',
  });
});

test('resolveAgendaDateSelection preserves an exact day as a single selection', () => {
  expect(
    resolveAgendaDateSelection({ kind: 'day', value: '2026-05-20' }, '2026-05-18'),
  ).toBe('2026-05-20');
});

test('resolveAgendaDateSelection represents Next 7 Days as a range', () => {
  expect(
    resolveAgendaDateSelection({ kind: 'preset', value: 'next7days' }, '2026-05-14'),
  ).toEqual({ from: '2026-05-14', to: '2026-05-21' });
});

test('resolveAgendaQuickAddDate uses today when it is inside the selected range', () => {
  expect(
    resolveAgendaQuickAddDate(
      { kind: 'range', from: '2026-05-10', to: '2026-05-18' },
      '2026-05-14',
    ),
  ).toBe('2026-05-14');
});

test('resolveAgendaQuickAddDate uses range start when today is outside the range', () => {
  expect(
    resolveAgendaQuickAddDate(
      { kind: 'range', from: '2026-06-10', to: '2026-06-18' },
      '2026-05-14',
    ),
  ).toBe('2026-06-10');
});

test('resolveAgendaQuickAddDate uses tomorrow for the Tomorrow preset', () => {
  expect(
    resolveAgendaQuickAddDate({ kind: 'preset', value: 'tomorrow' }, '2026-05-14'),
  ).toBe('2026-05-15');
});
