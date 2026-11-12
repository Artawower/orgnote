import { addDays, format, isValid, parseISO } from 'date-fns';
import { buildBufferUri, parseBufferUri } from 'orgnote-api';
import { ISO_DATE_FORMAT } from 'src/utils/org-date';
import { AGENDA_TASKS_PATH, AGENDA_TASKS_PATTERN } from '../constants';
import type {
  AgendaDateFilter,
  AgendaDayPreset,
  AgendaFilter,
  AgendaRangePreset,
} from '../models/agenda-task-query';

const ALL_FILTER: AgendaDateFilter = { kind: 'preset', value: 'all' };
const TASKS_SEGMENT = AGENDA_TASKS_PATH.slice(1);
const DAY_SEGMENT = 'day';
const RANGE_SEGMENT = 'range';
const PRESET_SEGMENT = 'preset';
const NEXT_DAYS_OFFSET = 7;
const DYNAMIC_PRESETS = ['today', 'tomorrow', 'next7days'] as const;
const AGENDA_TASKS_PATH_REGEX = new RegExp(AGENDA_TASKS_PATTERN);

const toIsoDate = (date: Date): string => format(date, ISO_DATE_FORMAT);

const isIsoDate = (value: string | undefined): value is string => {
  if (!value) return false;
  const parsed = parseISO(value);
  return isValid(parsed) && toIsoDate(parsed) === value;
};

type AgendaDayFilter = Extract<AgendaDateFilter, { kind: 'day' }>;
type AgendaRangeFilter = Extract<AgendaDateFilter, { kind: 'range' }>;

const normalizeRange = (
  from: string,
  to: string,
  relativePreset?: AgendaRangePreset,
): AgendaRangeFilter => ({
  kind: 'range',
  from: from <= to ? from : to,
  to: from <= to ? to : from,
  ...(relativePreset ? { relativePreset } : {}),
});

export const resolveAgendaPresetFilter = (
  preset: AgendaFilter,
  now = new Date(),
): AgendaDateFilter => {
  const today = toIsoDate(now);
  if (preset === 'today') return { kind: 'day', value: today, relativePreset: 'today' };
  if (preset === 'tomorrow') {
    return { kind: 'day', value: toIsoDate(addDays(now, 1)), relativePreset: 'tomorrow' };
  }
  if (preset === 'next7days') {
    return {
      kind: 'range',
      from: today,
      to: toIsoDate(addDays(now, NEXT_DAYS_OFFSET)),
      relativePreset: 'next7days',
    };
  }
  return { kind: 'preset', value: preset };
};

const resolveConcreteFilter = (filter: AgendaDateFilter, now: Date): AgendaDateFilter =>
  filter.kind === 'preset' ? resolveAgendaPresetFilter(filter.value, now) : filter;

const buildDayBufferUri = (filter: AgendaDayFilter): string => {
  const suffix = filter.relativePreset ? `/${filter.relativePreset}` : '';
  return buildBufferUri(
    'builtin',
    `${AGENDA_TASKS_PATH}/${DAY_SEGMENT}/${filter.value}${suffix}`,
  );
};

const buildRangeBufferUri = (filter: AgendaRangeFilter): string => {
  const range = normalizeRange(filter.from, filter.to, filter.relativePreset);
  const suffix = range.relativePreset ? `/${range.relativePreset}` : '';
  return buildBufferUri(
    'builtin',
    `${AGENDA_TASKS_PATH}/${RANGE_SEGMENT}/${range.from}/${range.to}${suffix}`,
  );
};

export const buildAgendaTaskBufferUri = (
  filter: AgendaDateFilter,
  now = new Date(),
): string => {
  const concreteFilter = resolveConcreteFilter(filter, now);
  if (concreteFilter.kind === 'day') return buildDayBufferUri(concreteFilter);
  if (concreteFilter.kind === 'range') return buildRangeBufferUri(concreteFilter);
  return buildBufferUri(
    'builtin',
    `${AGENDA_TASKS_PATH}/${PRESET_SEGMENT}/${concreteFilter.value}`,
  );
};

const isDayPreset = (value: string | undefined): value is AgendaDayPreset =>
  value === 'today' || value === 'tomorrow';

const parseDayFilter = (segments: string[]): AgendaDateFilter | undefined => {
  const value = segments[2];
  if (!isIsoDate(value)) return;
  if (segments.length === 3) return { kind: 'day', value };
  const relativePreset = segments[3];
  if (segments.length !== 4 || !isDayPreset(relativePreset)) return;
  return { kind: 'day', value, relativePreset };
};

const parseRangeFilter = (segments: string[]): AgendaDateFilter | undefined => {
  const from = segments[2];
  const to = segments[3];
  if (!isIsoDate(from) || !isIsoDate(to)) return;
  if (segments.length === 4) return normalizeRange(from, to);
  if (segments.length !== 5 || segments[4] !== 'next7days') return;
  if (toIsoDate(addDays(parseISO(from), NEXT_DAYS_OFFSET)) !== to) return;
  return normalizeRange(from, to, 'next7days');
};

const parsePresetFilter = (segments: string[]): AgendaDateFilter | undefined => {
  const preset = segments[2];
  if (segments.length !== 3 || (preset !== 'all' && preset !== 'overdue')) return;
  return { kind: 'preset', value: preset };
};

export const parseAgendaTaskBufferUri = (uri: string): AgendaDateFilter | undefined => {
  const { scheme, path } = parseBufferUri(uri);
  if (scheme !== 'builtin' || !AGENDA_TASKS_PATH_REGEX.test(path)) return;
  const segments = path.split('/').filter(Boolean);
  if (segments[0] !== TASKS_SEGMENT) return;
  if (segments.length === 1) return ALL_FILTER;
  if (segments[1] === DAY_SEGMENT) return parseDayFilter(segments);
  if (segments[1] === RANGE_SEGMENT) return parseRangeFilter(segments);
  if (segments[1] === PRESET_SEGMENT) return parsePresetFilter(segments);
  return;
};

const hasSameConcreteDates = (left: AgendaDateFilter, right: AgendaDateFilter): boolean => {
  if (left.kind === 'day' && right.kind === 'day') return left.value === right.value;
  if (left.kind !== 'range' || right.kind !== 'range') return false;
  return left.from === right.from && left.to === right.to;
};

export const resolveAgendaTaskBufferPreset = (
  uri: string,
  now = new Date(),
): AgendaFilter | undefined => {
  const filter = parseAgendaTaskBufferUri(uri);
  if (!filter) return;
  if (filter.kind === 'preset') return filter.value;
  return DYNAMIC_PRESETS.find((preset) =>
    hasSameConcreteDates(filter, resolveAgendaPresetFilter(preset, now)),
  );
};
