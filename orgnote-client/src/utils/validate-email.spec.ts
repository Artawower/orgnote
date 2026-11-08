import { expect, test } from 'vitest';
import { validateEmail } from './validate-email';

const messages = {
  required: 'Email is required',
  invalid: 'Email is invalid',
};

test('validateEmail returns required message for empty value', () => {
  const result = validateEmail('', messages);
  expect(result).toBe(messages.required);
});

test('validateEmail returns invalid message for malformed value', () => {
  const result = validateEmail('invalid-email', messages);
  expect(result).toBe(messages.invalid);
});

test('validateEmail returns undefined for valid value', () => {
  const result = validateEmail('user@example.com', messages);
  expect(result).toBeUndefined();
});
