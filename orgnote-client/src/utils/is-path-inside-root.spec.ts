import { expect, test } from 'vitest';
import { isPathInsideRoot } from './is-path-inside-root';

test('isPathInsideRoot accepts root path itself', () => {
  expect(isPathInsideRoot('/.orgnote/templates', '/.orgnote/templates')).toBe(true);
});

test('isPathInsideRoot accepts descendants', () => {
  expect(isPathInsideRoot('/.orgnote/templates/default.org.tmpl', '/.orgnote/templates')).toBe(true);
});

test('isPathInsideRoot rejects sibling prefixes', () => {
  expect(isPathInsideRoot('/.orgnote/templates-old/file.org.tmpl', '/.orgnote/templates')).toBe(false);
});
