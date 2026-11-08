import { test, expect } from 'vitest';
import type { LogRecord } from 'orgnote-api';
import { createLogSignature } from './log-signature';

const baseRecord = (): LogRecord => ({
  ts: new Date('2024-01-01T00:00:00.000Z'),
  level: 'error',
  message: 'Test',
});

test('createLogSignature masks emails and phones', () => {
  const record: LogRecord = {
    ...baseRecord(),
    context: { email: 'user@example.com', phone: '+1234567890' },
  };
  const signature = createLogSignature(record);
  expect(signature).toContain('u***@example.com');
  expect(signature).toContain('+********90');
});

test('createLogSignature ignores stack and cause', () => {
  const record: LogRecord = {
    ...baseRecord(),
    context: { stack: 'trace', cause: 'error', detail: 'value' },
  };
  const signature = createLogSignature(record);
  expect(signature).not.toContain('trace');
  expect(signature).not.toContain('cause');
  expect(signature).toContain('detail');
});
