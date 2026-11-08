import { expect, test } from 'vitest';
import { canUseRemoteAccountFeatures } from './server-capabilities';

test('hosted active users can use remote account features', () => {
  expect(canUseRemoteAccountFeatures({ active: 'pro' }, false)).toBe(true);
});

test('hosted inactive users cannot use remote account features', () => {
  expect(canUseRemoteAccountFeatures({}, false)).toBe(false);
});

test('self-hosted inactive users can use remote account features', () => {
  expect(canUseRemoteAccountFeatures({}, true)).toBe(true);
});

test('anonymous users cannot use remote account features', () => {
  expect(canUseRemoteAccountFeatures({ isAnonymous: true }, true)).toBe(false);
});

test('unauthenticated users cannot use remote account features', () => {
  expect(canUseRemoteAccountFeatures(null, true)).toBe(false);
});
