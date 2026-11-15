import type { OrgPropertyEntry } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import { format } from 'date-fns';
import {
  formatOrgDate,
  ISO_DATE_FORMAT,
  isoToSlashDate,
  parseCalendarDate,
  parseOrgDate,
} from 'src/utils/org-date';

export type PropertyScope = 'page' | 'headline';
export type PropertyValueType = 'text' | 'link' | 'tags' | 'boolean' | 'datetime';

export interface PropertyEditorState {
  readonly scope: PropertyScope;
  readonly stateId: string;
  readonly items: readonly OrgPropertyEntry[];
}

export const KNOWN_PROPERTY_KEYS = [
  'ID',
  'CUSTOM_ID',
  'ROAM_REFS',
  'source',
  'type',
  'created',
  'modified',
  'category',
  'visibility',
  'effort',
  'share_link',
  'share_updated_at',
  'status',
] as const;

const LINK_KEYS = new Set(['source', 'url', 'share_link', 'roam_refs']);
const TAG_KEYS = new Set(['tags', 'filetags', 'roam_tags']);
const DATETIME_KEYS = new Set(['created', 'modified', 'updated', 'share_updated_at']);
const BOOLEAN_PREFIXES = ['tq_show_', 'visibility'];

export const PREVIEW_PROPERTY_KEYS = [
  'ID',
  'CUSTOM_ID',
  'type',
  'source',
  'created',
  'modified',
] as const;

export const normalizeKey = (key: string): string => key.trim().toLowerCase();

export const getPropertyType = (key: string): PropertyValueType => {
  const normalized = normalizeKey(key);
  if (TAG_KEYS.has(normalized)) return 'tags';
  if (LINK_KEYS.has(normalized)) return 'link';
  if (DATETIME_KEYS.has(normalized)) return 'datetime';
  if (BOOLEAN_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return 'boolean';
  return 'text';
};

export const validatePropertyKey = (
  key: string,
  existingItems: readonly OrgPropertyEntry[],
  originalKey?: string,
): I18N | undefined => {
  const trimmed = key.trim();
  if (!trimmed) return I18N.PROPERTY_KEY_REQUIRED;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return I18N.PROPERTY_KEY_INVALID_CHARS;
  const duplicate = existingItems.some(
    (item) =>
      normalizeKey(item.key) === normalizeKey(trimmed) &&
      normalizeKey(item.key) !== normalizeKey(originalKey ?? ''),
  );
  return duplicate ? I18N.PROPERTY_KEY_DUPLICATE : undefined;
};

export const validatePropertyValue = (value: string): I18N | undefined =>
  /\r|\n/.test(value) ? I18N.PROPERTY_VALUE_MULTILINE : undefined;

export const parseTags = (value: string): string[] => {
  const colonTags = value.match(/:([^:]+)(?=:)/g);
  if (colonTags) return colonTags.map((tag) => tag.slice(1)).filter(Boolean);
  return value.split(/\s+/).filter(Boolean);
};

export const formatTags = (tags: readonly string[]): string =>
  tags.length ? `:${tags.filter(Boolean).join(':')}:` : '';

export const isTruthyPropertyValue = (value: string): boolean =>
  ['true', 'yes', '1', 'on'].includes(value.trim().toLowerCase());

export const formatBooleanValue = (value: boolean): string => (value ? 'true' : 'false');

export const toCalendarDate = (value: string): string | undefined => {
  const parsed = parseOrgDate(value);
  if (!parsed) return undefined;
  return format(parsed.date, ISO_DATE_FORMAT);
};

export const formatInactiveOrgDate = (calendarDate: string): string | undefined => {
  const date = parseCalendarDate(isoToSlashDate(calendarDate));
  if (!date) return undefined;
  return formatOrgDate(date, { openingBracket: '[', closingBracket: ']' });
};

export const getPreviewItems = (items: readonly OrgPropertyEntry[]): readonly OrgPropertyEntry[] =>
  PREVIEW_PROPERTY_KEYS.flatMap((key) => {
    const item = items.find((entry) => normalizeKey(entry.key) === normalizeKey(key));
    return item ? [item] : [];
  }).slice(0, 2);
