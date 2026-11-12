import { format, parseISO } from 'date-fns';
import type { DateRange } from 'src/models/date-picker';

export const ISO_DATE_FORMAT = 'yyyy-MM-dd';
export const todayIsoDate = (): string => format(new Date(), ISO_DATE_FORMAT);
const SLASH_DATE_FORMAT = 'yyyy/MM/dd';
const calendarDatePattern = /^(\d{4})\/(\d{2})\/(\d{2})$/;
const orgDatePattern = /^([<[])(\d{4})-(\d{2})-(\d{2})\s+[^\s>\]]+(.*)([>\]])\s*$/;

type OrgDateBracket = '<' | '[';
type OrgDateClosingBracket = '>' | ']';

const closingBracketByOpen: Record<OrgDateBracket, OrgDateClosingBracket> = {
  '<': '>',
  '[': ']',
};

const isOrgDateBracket = (value: string | undefined): value is OrgDateBracket => {
  return value === '<' || value === '[';
};

const isOrgDateClosingBracket = (value: string | undefined): value is OrgDateClosingBracket => {
  return value === '>' || value === ']';
};

export interface FormatOrgDateOptions {
  openingBracket?: OrgDateBracket;
  closingBracket?: OrgDateClosingBracket;
  suffix?: string;
  trailingSpace?: boolean;
}

export interface ParsedOrgDate {
  date: Date;
  comparisonDate: Date;
  openingBracket: OrgDateBracket;
  closingBracket: OrgDateClosingBracket;
  suffix: string;
}

const padDatePart = (value: number): string => String(value).padStart(2, '0');

const createDate = (year: number, month: number, day: number): Date => {
  return new Date(year, month - 1, day);
};

const matchesDateParts = (date: Date, year: number, month: number, day: number): boolean => {
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const isValidDate = (date: Date): boolean => !Number.isNaN(date.getTime());

const formatWeekday = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const formatCalendarDate = (date: Date): string => {
  return `${date.getFullYear()}/${padDatePart(date.getMonth() + 1)}/${padDatePart(date.getDate())}`;
};

export const parseCalendarDate = (value: string): Date | undefined => {
  const matches = value.match(calendarDatePattern);
  if (!matches) {
    return undefined;
  }

  const [, yearPart, monthPart, dayPart] = matches;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = createDate(year, month, day);

  if (!isValidDate(date) || !matchesDateParts(date, year, month, day)) {
    return undefined;
  }

  return date;
};

export const isoToSlashDate = (iso: string): string => {
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return format(date, SLASH_DATE_FORMAT);
};

export const slashToIsoDate = (slash: string): string => {
  const date = parseCalendarDate(slash);
  if (!date) return slash;
  return format(date, ISO_DATE_FORMAT);
};

export const isoRangeToSlashDateRange = (range: Readonly<DateRange>): DateRange => ({
  from: isoToSlashDate(range.from),
  to: isoToSlashDate(range.to),
});

export const slashRangeToIsoDateRange = (range: Readonly<DateRange>): DateRange => ({
  from: slashToIsoDate(range.from),
  to: slashToIsoDate(range.to),
});

const resolveComparisonDate = (date: Date, suffix: string): Date => {
  const timeMatches = suffix.match(/^\s+(\d{1,2}):(\d{2})(?:-\d{1,2}:\d{2})?/);
  if (!timeMatches) {
    return date;
  }

  const [, hoursPart, minutesPart] = timeMatches;
  const comparisonDate = new Date(date);
  comparisonDate.setHours(Number(hoursPart), Number(minutesPart), 0, 0);
  return comparisonDate;
};

export const formatOrgDate = (date: Date, options: FormatOrgDateOptions = {}): string => {
  const {
    openingBracket = '<',
    closingBracket = closingBracketByOpen[openingBracket],
    suffix = '',
    trailingSpace = false,
  } = options;

  const datePart = `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
  const value = `${openingBracket}${datePart} ${formatWeekday(date)}${suffix}${closingBracket}`;

  return trailingSpace ? `${value} ` : value;
};

export const parseOrgDate = (value: string): ParsedOrgDate | undefined => {
  const matches = value.match(orgDatePattern);
  if (!matches) {
    return undefined;
  }

  const [, openingBracket, yearPart, monthPart, dayPart, suffix, closingBracket] = matches;
  if (!isOrgDateBracket(openingBracket) || !isOrgDateClosingBracket(closingBracket)) {
    return undefined;
  }

  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = createDate(year, month, day);

  if (!isValidDate(date) || !matchesDateParts(date, year, month, day)) {
    return undefined;
  }

  const normalizedSuffix = suffix ?? '';

  return {
    date,
    comparisonDate: resolveComparisonDate(date, normalizedSuffix),
    openingBracket,
    closingBracket,
    suffix: normalizedSuffix,
  };
};

export const updateOrgDateCalendar = (
  rawValue: string,
  calendarDate: string,
): string | undefined => {
  const parsedOrgDate = parseOrgDate(rawValue);
  const nextDate = parseCalendarDate(calendarDate);

  if (!parsedOrgDate || !nextDate) {
    return undefined;
  }

  return formatOrgDate(nextDate, {
    openingBracket: parsedOrgDate.openingBracket,
    closingBracket: parsedOrgDate.closingBracket,
    suffix: parsedOrgDate.suffix,
  });
};
