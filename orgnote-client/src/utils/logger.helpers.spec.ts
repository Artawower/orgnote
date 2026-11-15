import { expect, test } from 'vitest';
import type { LogLevel } from 'orgnote-api';
import { toMessage, extractContext, mergeContext, buildRecord } from './logger';

const createRecord = (level: LogLevel, primary: unknown, extras: unknown[] = [], bindings: Record<string, unknown> = {}) =>
  buildRecord(level, primary, extras, bindings);

test('toMessage redacts email addresses', () => {
  const message = toMessage('Contact user@example.com for details');
  expect(message).toContain('u***@example.com');
});

test('toMessage redacts phone numbers', () => {
  const message = toMessage('Call +12345678901 now');
  expect(message).toMatch(/\+[*]+01 now$/);
});

test('extractContext returns structured error context', () => {
  const error = new Error('Boom');
  const context = extractContext(error);
  expect(context).toBeDefined();
  expect(context?.name).toBe('Error');
  expect(context?.message).toBe('Boom');
});

test('mergeContext prefers later values', () => {
  const merged = mergeContext([{ a: 1, shared: 'first' }, { b: 2, shared: 'second' }]);
  expect(merged).toEqual({ a: 1, b: 2, shared: 'second' });
});

test('buildRecord sanitizes context and bindings', () => {
  const record = createRecord(
    'error',
    'User user@example.com',
    [{ password: 'secret', email: 'user@example.com', nested: { phone: '+12345678901' } }],
    { apiKey: 'sk-1234567890' },
  );
  expect(record.message).toContain('u***@example.com');
  expect(record.context?.password).toBe('***');
  expect(record.context?.email).toBe('***');
  expect((record.context?.nested as Record<string, unknown>).phone).toBe('+*********01');
  expect(record.bindings?.apiKey).toBe('***');
});
