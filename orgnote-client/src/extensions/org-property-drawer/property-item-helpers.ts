import type { OrgPropertyEntry } from 'orgnote-api';
import { normalizeKey, getPropertyType } from './property-model';
import PropertyBooleanValue from './PropertyBooleanValue.vue';
import PropertyDateTimeValue from './PropertyDateTimeValue.vue';
import PropertyLinkValue from './PropertyLinkValue.vue';
import PropertyTagsValue from './PropertyTagsValue.vue';
import PropertyTextValue from './PropertyTextValue.vue';
import { truncateValue } from './property-value-utils';

const iconByValueType = {
  tags: 'sym_o_sell',
  boolean: 'sym_o_check_box',
  datetime: 'sym_o_calendar_month',
  link: 'sym_o_link',
  text: 'sym_o_notes',
} as const;

export const keyEquals = (first: string | undefined, second: string): boolean =>
  first ? normalizeKey(first) === normalizeKey(second) : false;

export const upsertItem = (
  items: readonly OrgPropertyEntry[],
  key: string,
  value: string,
): OrgPropertyEntry[] => {
  const existingIndex = items.findIndex((item) => keyEquals(item.key, key));
  const entry = { key, value };
  if (existingIndex < 0) return [...items, entry];
  return items.map((item, index) => (index === existingIndex ? entry : item));
};

export const renameItem = (
  items: readonly OrgPropertyEntry[],
  oldKey: string | undefined,
  newKey: string,
): OrgPropertyEntry[] => {
  if (!oldKey || keyEquals(oldKey, newKey)) return [...items];
  return items.map((item) => (keyEquals(item.key, oldKey) ? { ...item, key: newKey } : item));
};

export const removeItem = (items: readonly OrgPropertyEntry[], key: string): OrgPropertyEntry[] =>
  items.filter((item) => !keyEquals(item.key, key));

export const formatPreviewItem = (item: OrgPropertyEntry): string =>
  `${item.key} ${truncateValue(item.value)}`;

export const valueComponent = (item: OrgPropertyEntry) => {
  const type = getPropertyType(item.key);
  if (type === 'tags') return PropertyTagsValue;
  if (type === 'boolean') return PropertyBooleanValue;
  if (type === 'datetime') return PropertyDateTimeValue;
  if (type === 'link') return PropertyLinkValue;
  return PropertyTextValue;
};

export const iconByKey = (key: string): string => iconByValueType[getPropertyType(key)];
