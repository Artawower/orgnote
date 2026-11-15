import { beforeEach, expect, test, vi } from 'vitest';
import { RouteNames } from 'orgnote-api';

let user: { active?: string; isAnonymous?: boolean } | null = null;
let isSelfHosted = false;
const loadEnvironment = vi.fn(async () => undefined);

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useAuth: () => ({ user }),
      useSettings: () => ({ onboardingCompleted: false }),
      useNotifications: () => ({ hideAll: vi.fn() }),
    },
  },
}));

vi.mock('src/stores/server-environment', () => ({
  useServerEnvironmentStore: () => ({
    get isSelfHosted() {
      return isSelfHosted;
    },
    load: loadEnvironment,
  }),
}));

beforeEach(() => {
  user = null;
  isSelfHosted = false;
  loadEnvironment.mockClear();
});

const runActivationGuard = async () => {
  const { guardActivationRoute } = await import('src/utils/activation-route-guard');
  return guardActivationRoute();
};

test('activation route redirects inactive self-hosted users home', async () => {
  user = {};
  isSelfHosted = true;

  await expect(runActivationGuard()).resolves.toEqual({ name: RouteNames.Home });
  expect(loadEnvironment).toHaveBeenCalledTimes(1);
});

test('activation route remains available to inactive hosted users', async () => {
  user = {};

  await expect(runActivationGuard()).resolves.toBe(true);
});

test('activation route remains available to anonymous self-hosted users', async () => {
  user = { isAnonymous: true };
  isSelfHosted = true;

  await expect(runActivationGuard()).resolves.toBe(true);
});
