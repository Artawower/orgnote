import { test, expect, afterEach } from 'vitest';
import { applyScopedStyles, removeScopedStyles } from './css-utils';

const testScopeId = 'test-scope';
const testStyles = '.test { color: red; }';

afterEach(() => {
  const el = document.getElementById(testScopeId);
  el?.remove();
});

test('applyScopedStyles: creates style element in document head', () => {
  applyScopedStyles(testScopeId, testStyles);

  const styleEl = document.getElementById(testScopeId);
  expect(styleEl).not.toBeNull();
  expect(styleEl?.tagName.toLowerCase()).toBe('style');
});

test('applyScopedStyles: sets correct id attribute', () => {
  applyScopedStyles(testScopeId, testStyles);

  const styleEl = document.getElementById(testScopeId);
  expect(styleEl?.id).toBe(testScopeId);
});

test('applyScopedStyles: sets textContent to provided styles', () => {
  applyScopedStyles(testScopeId, testStyles);

  const styleEl = document.getElementById(testScopeId);
  expect(styleEl?.textContent).toBe(testStyles);
});

test('applyScopedStyles: appends style element to head', () => {
  applyScopedStyles(testScopeId, testStyles);

  const styleEl = document.getElementById(testScopeId);
  expect(styleEl?.parentElement).toBe(document.head);
});

test('applyScopedStyles: replaces existing style with same id', () => {
  const newStyles = '.new { color: blue; }';

  applyScopedStyles(testScopeId, testStyles);
  applyScopedStyles(testScopeId, newStyles);

  const styleEls = document.querySelectorAll(`#${testScopeId}`);
  expect(styleEls.length).toBe(1);
  expect(styleEls[0]?.textContent).toBe(newStyles);
});

test('applyScopedStyles: handles empty styles string', () => {
  applyScopedStyles(testScopeId, '');

  const styleEl = document.getElementById(testScopeId);
  expect(styleEl?.textContent).toBe('');
});

test('applyScopedStyles: handles multiline styles', () => {
  const multilineStyles = `
    .class1 { color: red; }
    .class2 { color: blue; }
  `;

  applyScopedStyles(testScopeId, multilineStyles);

  const styleEl = document.getElementById(testScopeId);
  expect(styleEl?.textContent).toBe(multilineStyles);
});

test('applyScopedStyles: allows multiple different scopes', () => {
  const scope1 = 'scope-1';
  const scope2 = 'scope-2';

  applyScopedStyles(scope1, '.a { color: red; }');
  applyScopedStyles(scope2, '.b { color: blue; }');

  expect(document.getElementById(scope1)).not.toBeNull();
  expect(document.getElementById(scope2)).not.toBeNull();

  document.getElementById(scope1)?.remove();
  document.getElementById(scope2)?.remove();
});

test('removeScopedStyles: removes style element by id', () => {
  applyScopedStyles(testScopeId, testStyles);
  expect(document.getElementById(testScopeId)).not.toBeNull();

  removeScopedStyles(testScopeId);

  expect(document.getElementById(testScopeId)).toBeNull();
});

test('removeScopedStyles: handles non-existent id gracefully', () => {
  expect(() => removeScopedStyles('non-existent-scope')).not.toThrow();
});

test('removeScopedStyles: removes only specified scope', () => {
  const scope1 = 'scope-1';
  const scope2 = 'scope-2';

  applyScopedStyles(scope1, '.a { color: red; }');
  applyScopedStyles(scope2, '.b { color: blue; }');

  removeScopedStyles(scope1);

  expect(document.getElementById(scope1)).toBeNull();
  expect(document.getElementById(scope2)).not.toBeNull();

  document.getElementById(scope2)?.remove();
});

test('removeScopedStyles: can be called multiple times for same scope', () => {
  applyScopedStyles(testScopeId, testStyles);

  removeScopedStyles(testScopeId);
  expect(() => removeScopedStyles(testScopeId)).not.toThrow();
});

test('scopedStyles: apply -> remove -> apply cycle works correctly', () => {
  const styles1 = '.first { color: red; }';
  const styles2 = '.second { color: blue; }';

  applyScopedStyles(testScopeId, styles1);
  expect(document.getElementById(testScopeId)?.textContent).toBe(styles1);

  removeScopedStyles(testScopeId);
  expect(document.getElementById(testScopeId)).toBeNull();

  applyScopedStyles(testScopeId, styles2);
  expect(document.getElementById(testScopeId)?.textContent).toBe(styles2);
});
