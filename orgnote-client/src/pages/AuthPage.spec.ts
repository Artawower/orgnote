import { test, expect, vi, beforeEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { encodeAuthState } from 'orgnote-api';

const mockRouteQuery = ref<Record<string, string | undefined>>({});
const mockRouteParams = ref<Record<string, string | undefined>>({});

const mockPush = vi.fn();

const { mockAuth, mockAuthUser } = vi.hoisted(() => ({
  mockAuth: vi.fn(() => Promise.resolve()),
  mockAuthUser: vi.fn(() => Promise.resolve()),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    isReady: () => Promise.resolve(),
    replace: vi.fn(),
    push: mockPush,
  }),
  useRoute: () => ({
    query: mockRouteQuery.value,
    params: mockRouteParams.value,
  }),
}));

vi.mock('src/stores/auth', () => ({
  useAuthStore: () => ({
    auth: mockAuth,
    authUser: mockAuthUser,
  }),
}));

vi.mock('src/boot/api', () => ({
  api: {},
}));

vi.mock('src/composables/use-splash-screen', () => ({
  useSplashScreen: () => ({
    show: vi.fn(),
    hide: vi.fn(),
  }),
}));

vi.mock('src/utils/platform-detection', () => ({
  platform: { is: { nativeMobile: false, mobile: false, ios: false } },
}));

vi.mock('src/utils/build-orgnote-url', () => ({
  buildOrgNoteUrl: vi.fn(),
}));

vi.mock('src/utils/is-valid-auth-provider', () => ({
  isValidAuthProvider: (v: unknown) => v === 'github',
}));

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual('vue-i18n');
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRouteQuery.value = {};
  mockRouteParams.value = {};
});

const mountAuthPage = async () => {
  const AuthPage = (await import('./AuthPage.vue')).default;
  const wrapper = shallowMount(AuthPage);
  await flushPromises();
  return wrapper;
};

test('AuthPage initiateOAuth passes redirectUrl from query param when state is absent', async () => {
  const activationUrl = '/auth/activate?key=ABC123&email=test@example.com';

  mockRouteParams.value = { initialProvider: 'github' };
  mockRouteQuery.value = { redirectUrl: activationUrl };

  await mountAuthPage();

  expect(mockAuth).toHaveBeenCalledWith(
    expect.objectContaining({
      redirectUrl: activationUrl,
    }),
  );
});

test('AuthPage initiateOAuth passes redirectUrl from encoded state', async () => {
  const activationUrl = '/auth/activate?key=ABC123&email=test@example.com';
  const encodedState = encodeAuthState({
    environment: 'web',
    redirectUrl: activationUrl,
  });

  mockRouteParams.value = { initialProvider: 'github' };
  mockRouteQuery.value = { state: encodedState };

  await mountAuthPage();

  expect(mockAuth).toHaveBeenCalledWith(
    expect.objectContaining({
      redirectUrl: activationUrl,
    }),
  );
});

test('AuthPage completeAuth redirects to activation page after successful auth callback', async () => {
  const activationUrl = '/auth/activate?key=ABC123&email=test@example.com';
  const encodedState = encodeAuthState({
    environment: 'web',
    redirectUrl: activationUrl,
  });

  const mockAssign = vi.fn();
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, assign: mockAssign },
    writable: true,
  });

  mockRouteParams.value = {};
  mockRouteQuery.value = {
    token: 'test-token',
    id: 'user-1',
    state: encodedState,
  };

  await mountAuthPage();

  expect(mockAuthUser).toHaveBeenCalled();
  expect(mockAssign).toHaveBeenCalledWith(activationUrl);

  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
  });
});
