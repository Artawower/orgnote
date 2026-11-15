import { beforeEach, expect, test, vi } from 'vitest';
import { RouteNames } from 'orgnote-api';
import { createSettingsRouter } from './modal-settings-routes';

let isSelfHosted = false;
const loadEnvironment = vi.fn(async () => undefined);

vi.mock('src/stores/server-environment', () => ({
  useServerEnvironmentStore: () => ({
    get isSelfHosted() {
      return isSelfHosted;
    },
    load: loadEnvironment,
  }),
}));

beforeEach(() => {
  isSelfHosted = false;
  loadEnvironment.mockClear();
});

test('subscription settings remain available on hosted servers', async () => {
  const router = createSettingsRouter();

  await router.push({ name: RouteNames.SubscriptionSettings });

  expect(router.currentRoute.value.name).toBe(RouteNames.SubscriptionSettings);
  expect(loadEnvironment).toHaveBeenCalledTimes(1);
});

test('subscription settings redirect to the menu on self-hosted servers', async () => {
  isSelfHosted = true;
  const router = createSettingsRouter();

  await router.push({ name: RouteNames.SubscriptionSettings });

  expect(router.currentRoute.value.name).toBe(RouteNames.SettingsPage);
});
