import { expect, test } from 'vitest';
import { extractPriorityFromTitle, removePriorityFromTitle } from './org-title-parser';

// extractPriorityFromTitle

test('extractPriorityFromTitle_returnsPriority_whenPriorityAtStart', () => {
  const result = extractPriorityFromTitle('[#A] My task');
  expect(result?.letter).toBe('A');
});

test('extractPriorityFromTitle_returnsCorrectRange_forReplace', () => {
  const title = '[#A] My task';
  const result = extractPriorityFromTitle(title);
  expect(result).not.toBeNull();
  expect(title.slice(result!.from, result!.to)).toBe('[#A]');
});

test('extractPriorityFromTitle_returnsNull_whenNoPriority', () => {
  expect(extractPriorityFromTitle('My task')).toBeNull();
});

test('extractPriorityFromTitle_returnsNull_forEmptyString', () => {
  expect(extractPriorityFromTitle('')).toBeNull();
});

test('extractPriorityFromTitle_returnsPriority_forPriorityOnly', () => {
  expect(extractPriorityFromTitle('[#B]')?.letter).toBe('B');
});

test('extractPriorityFromTitle_returnsPriority_withoutTrailingSpace', () => {
  const result = extractPriorityFromTitle('[#A]My task');
  expect(result?.letter).toBe('A');
});

// removePriorityFromTitle

test('removePriorityFromTitle_removesMarker_andTrimsLeadingSpace', () => {
  expect(removePriorityFromTitle('[#A] My task')).toBe('My task');
});

test('removePriorityFromTitle_returnsOriginal_whenNoPriority', () => {
  expect(removePriorityFromTitle('My task')).toBe('My task');
});

test('removePriorityFromTitle_returnsEmpty_whenOnlyPriority', () => {
  expect(removePriorityFromTitle('[#A]')).toBe('');
});

test('removePriorityFromTitle_removesMarker_withoutTrailingSpace', () => {
  expect(removePriorityFromTitle('[#A]My task')).toBe('My task');
});

test('removePriorityFromTitle_returnsEmpty_forEmptyString', () => {
  expect(removePriorityFromTitle('')).toBe('');
});
