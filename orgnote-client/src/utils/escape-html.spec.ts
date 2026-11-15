import { test, expect } from 'vitest';
import { escapeHtml } from './escape-html';

test('escapeHtml escapes ampersands', () => {
  expect(escapeHtml('a & b')).toBe('a &amp; b');
});

test('escapeHtml escapes less-than signs', () => {
  expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
});

test('escapeHtml escapes greater-than signs', () => {
  expect(escapeHtml('a > b')).toBe('a &gt; b');
});

test('escapeHtml escapes double quotes', () => {
  expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
});

test('escapeHtml handles empty string', () => {
  expect(escapeHtml('')).toBe('');
});

test('escapeHtml returns plain text unchanged', () => {
  expect(escapeHtml('hello world')).toBe('hello world');
});

test('escapeHtml escapes multiple different entities in one string', () => {
  expect(escapeHtml('<img src="x" alt="a & b">')).toBe(
    '&lt;img src=&quot;x&quot; alt=&quot;a &amp; b&quot;&gt;',
  );
});

test('escapeHtml escapes repeated occurrences', () => {
  expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;');
});

test('escapeHtml preserves single quotes', () => {
  expect(escapeHtml("it's fine")).toBe("it's fine");
});
