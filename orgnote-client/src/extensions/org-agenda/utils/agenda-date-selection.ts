import { addDays, format, parseISO } from 'date-fns';
import type { DatePickerSelection } from 'src/models/date-picker';
import { ISO_DATE_FORMAT, todayIsoDate } from 'src/utils/org-date';
import type { AgendaDateFilter } from '../models/agenda-task-query';

type AgendaDateSelection = Exclude<DatePickerSelection, undefined>;

const addIsoDays = (date: string, days: number): string =>
  format(addDays(parseISO(date), days), ISO_DATE_FORMAT);

export const createAgendaDateFilter = (
  selection: DatePickerSelection,
  today = todayIsoDate(),
): AgendaDateFilter => {
  if (!selection) return { kind: 'preset', value: 'all' };
  if (selection === today) return { kind: 'preset', value: 'today' };
  if (typeof selection === 'string') return { kind: 'day', value: selection };
  const [from, to] =
    selection.from <= selection.to
      ? [selection.from, selection.to]
      : [selection.to, selection.from];
  return { kind: 'range', from, to };
};

export const resolveAgendaDateSelection = (
  filter: AgendaDateFilter,
  today = todayIsoDate(),
): AgendaDateSelection => {
  if (filter.kind === 'day') return filter.value;
  if (filter.kind === 'range') return { from: filter.from, to: filter.to };
  if (filter.value === 'tomorrow') return addIsoDays(today, 1);
  if (filter.value === 'next7days') return { from: today, to: addIsoDays(today, 7) };
  return today;
};

export const resolveAgendaQuickAddDate = (
  filter: AgendaDateFilter,
  today = todayIsoDate(),
): string => {
  const selection = resolveAgendaDateSelection(filter, today);
  if (typeof selection === 'string') return selection;
  if (selection.from <= today && today <= selection.to) return today;
  return selection.from;
};
