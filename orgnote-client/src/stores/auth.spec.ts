import { expect, test, vi, beforeEach, describe } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRouter = {
  push: vi.fn(),
};

const mockApi = {
  vue: {
    router: mockRouter,
  },
};

vi.mock('src/boot/api', () => ({
  api: mockApi,
}));

const mockSdk = {
  auth: {
    authLogoutGet: vi.fn(() => Promise.resolve({ data: {} })),
    authVerifyGet: vi.fn(() => Promise.resolve({ data: { data: null } })),
    authAccountDelete: vi.fn(() => Promise.resolve()),
  },
};

vi.mock('src/boot/axios', () => ({
  sdk: mockSdk,
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
});

test('logout should navigate to Home route via api.vue.router', async () => {
  const { useAuthStore } = await import('./auth');
  const authStore = useAuthStore();

  authStore.token = 'test-token';
  authStore.user = { id: '1', nickName: 'test' };

  await authStore.logout();

  expect(mockSdk.auth.authLogoutGet).toHaveBeenCalled();
  expect(authStore.token).toBe('');
  expect(authStore.user).toBeNull();
  expect(mockRouter.push).toHaveBeenCalledWith({ name: 'Home' });
});

test('logout should work when called outside Vue component context', async () => {
  const { useAuthStore } = await import('./auth');
  const authStore = useAuthStore();

  authStore.token = 'test-token';

  await authStore.logout();

  expect(mockRouter.push).toHaveBeenCalledWith({ name: 'Home' });
});

test('removeUserAccount should delete account and reload page', async () => {
  const { useAuthStore } = await import('./auth');
  const authStore = useAuthStore();

  authStore.user = { id: '1', nickName: 'test' };

  const reloadMock = vi.fn();
  const originalReload = window.location.reload;
  window.location.reload = reloadMock;

  await authStore.removeUserAccount();

  expect(mockSdk.auth.authAccountDelete).toHaveBeenCalled();
  expect(mockRouter.push).toHaveBeenCalledWith({ name: 'Home' });
  expect(reloadMock).toHaveBeenCalled();

  window.location.reload = originalReload;
});

describe('architecture constraints', () => {
  test('should not use useRouter() - it fails outside Vue component context', () => {
    const authStorePath = resolve(__dirname, './auth.ts');
    const content = readFileSync(authStorePath, 'utf-8');

    expect(content).not.toMatch(/useRouter\s*\(/);
  });

  test('should use api.vue.router for navigation', () => {
    const authStorePath = resolve(__dirname, './auth.ts');
    const content = readFileSync(authStorePath, 'utf-8');

    expect(content).toMatch(/api\.vue\.router/);
  });
});
