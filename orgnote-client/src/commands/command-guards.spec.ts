import { beforeEach, expect, test, vi } from 'vitest';
import { isNotAuthenticated, isNotActiveUser, isAuthenticated } from './command-guards';
import type { OrgNoteApi } from 'orgnote-api';

let isSelfHosted = false;

vi.mock('src/stores/server-environment', () => ({
  useServerEnvironmentStore: () => ({
    get isSelfHosted() {
      return isSelfHosted;
    },
  }),
}));

const createMockApi = (
  user: { active?: boolean; isAnonymous?: boolean } | null,
): OrgNoteApi =>
  ({
    core: {
      useAuth: () => ({ user }),
    },
  }) as unknown as OrgNoteApi;

beforeEach(() => {
  isSelfHosted = false;
});

test('isNotAuthenticated returns true when user is null', () => {
  const api = createMockApi(null);
  expect(isNotAuthenticated(api)).toBe(true);
});

test('isNotAuthenticated returns false when user exists', () => {
  const api = createMockApi({ active: true });
  expect(isNotAuthenticated(api)).toBe(false);
});

test('isNotAuthenticated returns false when user exists but inactive', () => {
  const api = createMockApi({ active: false });
  expect(isNotAuthenticated(api)).toBe(false);
});

test('isAuthenticated returns false when user is null', () => {
  const api = createMockApi(null);
  expect(isAuthenticated(api)).toBe(false);
});

test('isAuthenticated returns true when user exists', () => {
  const api = createMockApi({ active: true });
  expect(isAuthenticated(api)).toBe(true);
});

test('isAuthenticated returns true when user exists but inactive', () => {
  const api = createMockApi({ active: false });
  expect(isAuthenticated(api)).toBe(true);
});

test('isNotActiveUser returns true when user is null', () => {
  const api = createMockApi(null);
  expect(isNotActiveUser(api)).toBe(true);
});

test('isNotActiveUser returns true when user exists but inactive', () => {
  const api = createMockApi({ active: false });
  expect(isNotActiveUser(api)).toBe(true);
});

test('isNotActiveUser returns true when user.active is undefined', () => {
  const api = createMockApi({});
  expect(isNotActiveUser(api)).toBe(true);
});

test('isNotActiveUser returns false for inactive self-hosted users', () => {
  isSelfHosted = true;
  const api = createMockApi({});
  expect(isNotActiveUser(api)).toBe(false);
});

test('isNotActiveUser returns true for anonymous self-hosted users', () => {
  isSelfHosted = true;
  const api = createMockApi({ isAnonymous: true });
  expect(isNotActiveUser(api)).toBe(true);
});

test('isNotActiveUser returns false when user exists and is active', () => {
  const api = createMockApi({ active: true });
  expect(isNotActiveUser(api)).toBe(false);
});
