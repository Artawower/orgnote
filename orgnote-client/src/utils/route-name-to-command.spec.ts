import { test, expect } from 'vitest';
import { convertRouterNameToCommand } from './route-name-to-command';

test('converts camelCase router name to lowercase command', () => {
  const input = 'myRouterName';
  const output = convertRouterNameToCommand(input);
  expect(output).toBe('my router name');
});

test('handles single word router name', () => {
  const input = 'Router';
  const output = convertRouterNameToCommand(input);
  expect(output).toBe('router');
});

test('handles symbol as router name', () => {
  const input = Symbol('myRouterName');
  const output = convertRouterNameToCommand(input);
  expect(output).toBe('symbol(my router name)');
});

test('handles empty string router name', () => {
  const input = '';
  const output = convertRouterNameToCommand(input);
  expect(output).toBe('');
});

test('handles already spaced words', () => {
  const input = 'My Router Name';
  const output = convertRouterNameToCommand(input);
  expect(output).toBe('my router name');
});
