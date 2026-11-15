import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { Router } from 'vue-router';
import { RouteNames } from 'orgnote-api';
import TheSettings from './TheSettings.vue';

const desktopBelow = ref(false);
const { reportError } = vi.hoisted(() => ({ reportError: vi.fn() }));

vi.mock('src/composables/use-screen-detection', () => ({
  useScreenDetection: () => ({
    desktopBelow,
  }),
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError,
  },
}));

type TestRoute = {
  name: RouteNames;
  matched: Array<{ components?: Record<string, unknown> }>;
};

const createSettingsRouter = (routeName: RouteNames = RouteNames.Home) => {
  const currentRoute = ref<TestRoute>({ name: routeName, matched: [] });

  const push = vi.fn(async ({ name }: { name: RouteNames }) => {
    currentRoute.value = { name, matched: [] };
  });

  const replace = vi.fn(async ({ name }: { name: RouteNames }) => {
    currentRoute.value = { name, matched: [] };
  });

  return {
    currentRoute,
    push,
    replace,
  };
};

beforeEach(() => {
  desktopBelow.value = false;
  reportError.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('TheSettings opens system settings first on desktop when initial route is settings page', async () => {
  const settingsRouter = createSettingsRouter();

  mount(TheSettings, {
    props: {
      initialRoute: RouteNames.SettingsPage,
      settingsRouter: settingsRouter as unknown as Router,
    },
    shallow: true,
  });

  await flushPromises();

  expect(settingsRouter.push).toHaveBeenCalledWith({ name: RouteNames.SystemSettings });
  expect(settingsRouter.replace).not.toHaveBeenCalled();
  expect(reportError).not.toHaveBeenCalled();
});

test('TheSettings does not redirect when screen is below desktop breakpoint', async () => {
  desktopBelow.value = true;
  const settingsRouter = createSettingsRouter();

  mount(TheSettings, {
    props: {
      initialRoute: RouteNames.SettingsPage,
      settingsRouter: settingsRouter as unknown as Router,
    },
    shallow: true,
  });

  await flushPromises();

  expect(settingsRouter.push).toHaveBeenCalledWith({ name: RouteNames.SettingsPage });
  expect(settingsRouter.replace).not.toHaveBeenCalled();
});

test('TheSettings redirects to system settings when switching from mobile to desktop on settings page', async () => {
  desktopBelow.value = true;
  const settingsRouter = createSettingsRouter();

  mount(TheSettings, {
    props: {
      initialRoute: RouteNames.SettingsPage,
      settingsRouter: settingsRouter as unknown as Router,
    },
    shallow: true,
  });

  await flushPromises();
  desktopBelow.value = false;
  await flushPromises();

  expect(settingsRouter.replace).toHaveBeenCalledWith({ name: RouteNames.SystemSettings });
});

test('TheSettings reports error when initial navigation push fails', async () => {
  const pushError = new Error('push failed');
  const settingsRouter = createSettingsRouter();
  settingsRouter.push.mockImplementation(async () => {
    throw pushError;
  });

  mount(TheSettings, {
    props: {
      initialRoute: RouteNames.SystemSettings,
      settingsRouter: settingsRouter as unknown as Router,
    },
    shallow: true,
  });

  await flushPromises();

  expect(reportError).toHaveBeenCalledWith(pushError);
});

test('TheSettings reports error when redirect replace fails', async () => {
  desktopBelow.value = true;
  const replaceError = new Error('replace failed');
  const settingsRouter = createSettingsRouter(RouteNames.SettingsPage);
  settingsRouter.replace.mockImplementation(async () => {
    throw replaceError;
  });

  mount(TheSettings, {
    props: {
      initialRoute: RouteNames.SettingsPage,
      settingsRouter: settingsRouter as unknown as Router,
    },
    shallow: true,
  });

  await flushPromises();
  desktopBelow.value = false;
  await flushPromises();

  expect(reportError).toHaveBeenCalledWith(replaceError);
});
