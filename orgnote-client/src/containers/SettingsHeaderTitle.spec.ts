import { mount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';
import { createPinia } from 'pinia';
import { RouteNames } from 'orgnote-api';
import SettingsHeaderTitle from './SettingsHeaderTitle.vue';
import NavigationHistory from 'src/components/NavigationHistory.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import type { Router } from 'vue-router';

vi.mock('src/utils/camel-case-to-words', () => ({
  camelCaseToWords: (str: string) => str,
}));

type MockedRouter = {
  currentRoute: {
    value: {
      name: RouteNames;
      fullPath: string;
    };
  };
  back: ReturnType<typeof vi.fn>;
  push: ReturnType<typeof vi.fn>;
};

const createMockRouter = (backUpdatesRoute = false): MockedRouter => {
  const currentRoute = {
    value: {
      name: RouteNames.SystemSettings,
      fullPath: '/settings/system',
    },
  };

  return {
    currentRoute,
    back: vi.fn(() => {
      if (!backUpdatesRoute) {
        return;
      }

      currentRoute.value = {
        name: RouteNames.SettingsPage,
        fullPath: '/',
      };
    }),
    push: vi.fn(async ({ name }: { name: RouteNames }) => {
      currentRoute.value = {
        name,
        fullPath: name === RouteNames.SettingsPage ? '/' : '/settings/system',
      };
    }),
  };
};

test('SettingsHeaderTitle renders title correctly', () => {
  const mockRouter = createMockRouter();

  const wrapper = mount(SettingsHeaderTitle, {
    props: {
      settingsRouter: mockRouter as unknown as Router,
    },
    global: {
      plugins: [createPinia()],
      components: {
        NavigationHistory,
        VisibilityWrapper,
      },
      stubs: {
        'action-button': true,
      },
    },
  });

  expect(wrapper.find('h1').text()).toBe(RouteNames.SystemSettings);
});

test('SettingsHeaderTitle falls back to settings page when back does not change route', async () => {
  const mockRouter = createMockRouter(false);

  const wrapper = mount(SettingsHeaderTitle, {
    props: {
      settingsRouter: mockRouter as unknown as Router,
    },
    global: {
      plugins: [createPinia()],
      components: {
        NavigationHistory,
        VisibilityWrapper,
      },
      stubs: {
        'action-button': true,
      },
    },
  });

  const component = wrapper.vm as unknown as { handleReturnBack: () => Promise<void> };

  await component.handleReturnBack();

  expect(mockRouter.back).toHaveBeenCalled();
  expect(mockRouter.push).toHaveBeenCalledWith({ name: RouteNames.SettingsPage });
});

test('SettingsHeaderTitle does not use fallback when back changes route', async () => {
  const mockRouter = createMockRouter(true);

  const wrapper = mount(SettingsHeaderTitle, {
    props: {
      settingsRouter: mockRouter as unknown as Router,
    },
    global: {
      plugins: [createPinia()],
      components: {
        NavigationHistory,
        VisibilityWrapper,
      },
      stubs: {
        'action-button': true,
      },
    },
  });

  const component = wrapper.vm as unknown as { handleReturnBack: () => Promise<void> };

  await component.handleReturnBack();

  expect(mockRouter.back).toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

test('SettingsHeaderTitle does nothing when settingsRouter is not available', async () => {
  const wrapper = mount(SettingsHeaderTitle, {
    global: {
      plugins: [createPinia()],
      components: {
        NavigationHistory,
        VisibilityWrapper,
      },
      stubs: {
        'action-button': true,
      },
    },
  });

  const component = wrapper.vm as unknown as { handleReturnBack: () => Promise<void> };

  await component.handleReturnBack();
});
