import type { OrgRepeater } from 'org-mode-ast';
import type { OrgWarning } from '../types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (value: number): string => String(value).padStart(2, '0');

const formatDateOnly = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatTime = (date: Date): string =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const dayName = (date: Date): string => DAY_NAMES[date.getDay()] ?? '';

const formatRepeater = (repeater: OrgRepeater | undefined): string =>
  repeater ? ` ${repeater.type}${repeater.value}${repeater.unit}` : '';

const formatWarning = (warning: OrgWarning | undefined): string =>
  warning ? ` ${warning.type}${warning.value}${warning.unit}` : '';

export interface FormatOrgStampOptions {
  active: boolean;
  withTime: boolean;
  repeater?: OrgRepeater;
  warning?: OrgWarning;
}

export const formatOrgStamp = (
  date: Date,
  options: FormatOrgStampOptions
): string => {
  const brackets: [string, string] = options.active ? ['<', '>'] : ['[', ']'];
  const datePart = formatDateOnly(date);
  const timePart = options.withTime ? ` ${formatTime(date)}` : '';
  return `${brackets[0]}${datePart} ${dayName(date)}${timePart}${formatRepeater(options.repeater)}${formatWarning(options.warning)}${brackets[1]}`;
};

export const formatInactiveTimestamp = (date: Date): string =>
  formatOrgStamp(date, { active: false, withTime: true });
