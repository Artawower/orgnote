import { expect, test } from 'vitest';
import { I18N } from 'orgnote-api';
import {
  formatInactiveOrgDate,
  formatTags,
  getPropertyType,
  parseTags,
  toCalendarDate,
  validatePropertyKey,
  validatePropertyValue,
} from './property-model';
import { PROPERTY_VALUE_PREVIEW_LIMIT, truncateValue } from './property-value-utils';

test('property model detects known value types', () => {
  expect(getPropertyType('tags')).toBe('tags');
  expect(getPropertyType('source')).toBe('link');
  expect(getPropertyType('created')).toBe('datetime');
  expect(getPropertyType('TQ_show_backlink')).toBe('boolean');
  expect(getPropertyType('custom')).toBe('text');
});

test('property model parses and formats org tags', () => {
  expect(parseTags(':youtube:ai:')).toEqual(['youtube', 'ai']);
  expect(parseTags('youtube ai')).toEqual(['youtube', 'ai']);
  expect(formatTags(['youtube', 'ai'])).toBe(':youtube:ai:');
});

test('property model adapts org dates to date picker values', () => {
  expect(toCalendarDate('[2026-06-25 Thu]')).toBe('2026-06-25');
  expect(formatInactiveOrgDate('2026-06-26')).toBe('[2026-06-26 Fri]');
});

test('property model validates keys and single-line values', () => {
  expect(validatePropertyKey('', [])).toBe(I18N.PROPERTY_KEY_REQUIRED);
  expect(validatePropertyKey('bad:key', [])).toBe(I18N.PROPERTY_KEY_INVALID_CHARS);
  expect(validatePropertyKey('type', [{ key: 'TYPE', value: 'note' }])).toBe(
    I18N.PROPERTY_KEY_DUPLICATE,
  );
  expect(validatePropertyKey('type', [], 'type')).toBeUndefined();
  expect(validatePropertyValue('line\nbreak')).toBe(I18N.PROPERTY_VALUE_MULTILINE);
});

test('property preview truncates long values to the preview limit', () => {
  const visibleValue = 'a'.repeat(PROPERTY_VALUE_PREVIEW_LIMIT);
  const hiddenTailValue = `${visibleValue}b`;
  expect(truncateValue(visibleValue)).toBe(visibleValue);
  expect(truncateValue(hiddenTailValue)).toBe(`${'a'.repeat(PROPERTY_VALUE_PREVIEW_LIMIT - 1)}…`);
});
