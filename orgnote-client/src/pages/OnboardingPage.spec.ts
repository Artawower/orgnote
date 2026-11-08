import { test, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { flushPromises, shallowMount } from '@vue/test-utils';

const mockUser = ref<Record<string, unknown> | null>(null);
const mockOnboardingCompleted = ref(false);
const mockIsSelfHosted = ref(false);
const mockOnboardingCurrentStep = ref(0);
const mockPush = vi.fn();

interface OnboardingPageVm {
  currentStep: number;
  goBack: () => void;
}

const asVm = (wrapper: ReturnType<typeof shallowMount>) =>
  wrapper.vm as unknown as OnboardingPageVm;

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: {}, params: {} }),
}));

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia');
  return {
    ...actual,
    storeToRefs: () => ({
      onboardingCompleted: mockOnboardingCompleted,
      onboardingCurrentStep: mockOnboardingCurrentStep,
      currentFsName: ref(''),
      isSelfHosted: mockIsSelfHosted,
    }),
  };
});

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useAuth: () => ({ user: mockUser.value, subscribe: vi.fn(async () => true) }),
      useSettings: () => ({
        onboardingCompleted: mockOnboardingCompleted.value,
        onboardingCurrentStep: mockOnboardingCurrentStep.value,
      }),
      useFileSystemManager: () => ({
        currentFsName: ref(''),
        fileSystems: [],
        useFs: vi.fn(),
      }),
    },
  },
}));

vi.mock('src/stores/server-environment', () => ({
  useServerEnvironmentStore: () => ({ isSelfHosted: mockIsSelfHosted.value }),
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportError: vi.fn() },
}));

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual('vue-i18n');
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) };
});

vi.mock('orgnote-api', async () => {
  const actual = await vi.importActual('orgnote-api');
  return { ...actual, I18N: {}, RouteNames: { Home: 'Home' } };
});
vi.mock('orgnote-api/constants', () => ({ RouteNames: { Home: 'Home' } }));
vi.mock('orgnote-api/utils', () => ({
  to: (fn: () => Promise<unknown>) => fn(),
  stringifyToml: () => '',
  parseToml: () => ({}),
}));
vi.mock('orgnote-api/remote-api', () => ({}));
vi.mock('orgnote-api/encryption', () => ({}));
vi.mock('orgnote-api/mappers', () => ({}));
vi.mock('orgnote-api/commands', () => ({}));
vi.mock('orgnote-api/sync', () => ({}));

const stubs = {
  SafeArea: { template: '<div><slot/></div>' },
  PageWrapper: { template: '<div><slot/></div>' },
  ContainerLayout: { template: '<div><slot name="header"/><slot/><slot name="footer"/></div>' },
  AppFlex: { template: '<div><slot/></div>' },
  AppButton: { template: '<button><slot/></button>' },
  CardWrapper: { template: '<div><slot/></div>' },
  MenuItem: { template: '<div><slot/></div>' },
  ModalContainer: { template: '<div/>' },
  ProgressDots: { template: '<div/>' },
  WelcomeStep: { template: '<div/>' },
  FsSelectionStep: { template: '<div/>' },
  ServerStep: { template: '<div/>' },
  AuthStep: { template: '<div/>' },
  ActivationStep: { template: '<div/>' },
  EmacsStep: { template: '<div/>' },
  SyncSetupStep: { template: '<div/>' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = null;
  mockOnboardingCompleted.value = false;
  mockIsSelfHosted.value = false;
  mockOnboardingCurrentStep.value = 0;
});

const mountPage = async () => {
  const OnboardingPage = (await import('./OnboardingPage.vue')).default;
  const wrapper = shallowMount(OnboardingPage, { global: { stubs } });
  await flushPromises();
  return wrapper;
};

// Step indices: 0=Welcome, 1=Fs, 2=Server, 3=Auth, 4=Activation/SyncSetup, 5=Emacs

test('OnboardingPage auto-skips AuthStep when user is logged in', async () => {
  mockOnboardingCurrentStep.value = 3;
  mockUser.value = { email: 'test@example.com' };

  const wrapper = await mountPage();

  expect(asVm(wrapper).currentStep).toBe(4);
  expect(mockOnboardingCompleted.value).toBe(false);
  expect(mockPush).not.toHaveBeenCalled();
});

test('OnboardingPage shows SyncSetupStep when user has active subscription', async () => {
  mockOnboardingCurrentStep.value = 4;
  mockUser.value = { email: 'test@example.com', active: 'premium' };

  const wrapper = await mountPage();

  expect(asVm(wrapper).currentStep).toBe(4);
  expect(mockOnboardingCompleted.value).toBe(false);
  expect(mockPush).not.toHaveBeenCalled();
});

test('OnboardingPage shows SyncSetupStep for inactive self-hosted users', async () => {
  mockOnboardingCurrentStep.value = 4;
  mockUser.value = { email: 'test@example.com' };
  mockIsSelfHosted.value = true;

  const wrapper = await mountPage();

  expect(asVm(wrapper).currentStep).toBe(4);
  expect(wrapper.findComponent(stubs.SyncSetupStep).exists()).toBe(true);
  expect(wrapper.findComponent(stubs.ActivationStep).exists()).toBe(false);
});

test('OnboardingPage keeps anonymous self-hosted users on ActivationStep', async () => {
  mockOnboardingCurrentStep.value = 4;
  mockUser.value = { isAnonymous: true };
  mockIsSelfHosted.value = true;

  const wrapper = await mountPage();

  expect(asVm(wrapper).currentStep).toBe(4);
  expect(wrapper.findComponent(stubs.ActivationStep).exists()).toBe(true);
});

test('OnboardingPage stays on ActivationStep when user is logged in but not active', async () => {
  mockOnboardingCurrentStep.value = 4;
  mockUser.value = { email: 'test@example.com' };

  const wrapper = await mountPage();

  expect(asVm(wrapper).currentStep).toBe(4);
  expect(mockOnboardingCompleted.value).toBe(false);
  expect(mockPush).not.toHaveBeenCalled();
});

test('OnboardingPage stays on AuthStep when user is null', async () => {
  mockOnboardingCurrentStep.value = 3;
  mockUser.value = null;

  const wrapper = await mountPage();

  expect(asVm(wrapper).currentStep).toBe(3);
  expect(mockPush).not.toHaveBeenCalled();
});


test('OnboardingPage auto-skips ActivationStep and EmacsStep when user is not authenticated', async () => {
  mockOnboardingCurrentStep.value = 4;
  mockUser.value = null;

  await mountPage();

  expect(mockOnboardingCompleted.value).toBe(true);
  expect(mockOnboardingCurrentStep.value).toBe(0);
  expect(mockPush).toHaveBeenCalledWith({ name: 'Home' });
});

test('OnboardingPage goBack skips completed ActivationStep when user is not authenticated', async () => {
  mockOnboardingCurrentStep.value = 5;
  mockUser.value = null;

  const wrapper = await mountPage();

  await asVm(wrapper).goBack();

  expect(asVm(wrapper).currentStep).toBe(3);
});

test('OnboardingPage goBack lands on SyncSetupStep when user is active', async () => {
  mockOnboardingCurrentStep.value = 5;
  mockUser.value = { email: 'test@example.com', active: 'premium' };

  const wrapper = await mountPage();

  await asVm(wrapper).goBack();

  expect(asVm(wrapper).currentStep).toBe(4);
});

test('OnboardingPage hides content immediately when completing onboarding', async () => {
  mockOnboardingCurrentStep.value = 5;
  mockUser.value = { email: 'test@example.com', active: 'premium' };

  const wrapper = await mountPage();

  // safe-area must not be rendered — v-if="!isNavigatingAway" was false during render
  expect(wrapper.find('safe-area-stub').exists()).toBe(false);
  expect(mockPush).toHaveBeenCalledWith({ name: 'Home' });
});
test('OnboardingPage restores persisted step on mount', async () => {
  mockOnboardingCurrentStep.value = 2;

  const wrapper = await mountPage();

  expect(asVm(wrapper).currentStep).toBe(2);
});

test('OnboardingPage starts at step 0 by default', async () => {
  mockOnboardingCurrentStep.value = 0;

  const wrapper = await mountPage();

  expect(asVm(wrapper).currentStep).toBe(0);
});
