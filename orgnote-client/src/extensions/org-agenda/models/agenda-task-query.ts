import type { DateRange } from 'src/models/date-picker';

export type AgendaFilter = 'overdue' | 'today' | 'tomorrow' | 'next7days' | 'all';
export type AgendaDayPreset = 'today' | 'tomorrow';
export type AgendaRangePreset = 'next7days';

export type AgendaDateFilter =
  | { readonly kind: 'preset'; readonly value: AgendaFilter }
  | { readonly kind: 'day'; readonly value: string; readonly relativePreset?: AgendaDayPreset }
  | ({ readonly kind: 'range'; readonly relativePreset?: AgendaRangePreset } & Readonly<DateRange>);

export interface AgendaTaskQuery {
  readonly dateFilter: AgendaDateFilter;
  readonly filePath?: string;
  readonly matchingTaskIds?: readonly string[];
}

