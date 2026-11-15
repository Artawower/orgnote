import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  RouteNames,
  RoutePaths,
  type AuthStore,
  type PersonalInfo,
  type OAuthProvider,
} from 'orgnote-api';
import { api } from 'src/boot/api';
import { encodeAuthState, isAuthEnvironment, type AuthState } from 'orgnote-api';
import { sdk } from 'src/boot/axios';
import { to } from 'orgnote-api/utils';
import { platformSpecificValue } from 'src/utils/platform-specific-value';
import { platformMatch } from 'src/utils/platform-detection';
import { reporter } from 'src/boot/report';

interface AuthParams {
  provider: string;
  environment?: string;
  redirectUrl?: string;
}

class AuthRedirectUrlMissingError extends Error {
  constructor() {
    super('No redirect URL received from auth server');
    this.name = 'AuthRedirectUrlMissingError';
  }
}

export const useAuthStore = defineStore<'auth', AuthStore>(
  'auth',
  (): AuthStore => {
    const token = ref<string>('');
    const user = ref<PersonalInfo | null>(null);
    const provider = ref<OAuthProvider>('github');

    const resetAuthInfo = () => {
      user.value = null;
      token.value = '';
    };

    const getEnvironment = (): AuthState['environment'] =>
      platformSpecificValue<{ data: AuthState['environment'] }>({
        data: 'web',
        nativeMobile: 'mobile',
        electron: 'electron',
      });

    const getAuthUrl = (authProvider: string, state: AuthState): string => {
      const strState = encodeURIComponent(encodeAuthState(state));
      const baseUrl = process.env.AUTH_URL || '';
      return `${baseUrl}/${RoutePaths.AUTH_LOGIN}/${authProvider}/login?state=${strState}`;
    };

    const fetchAuthRedirectUrl = async (
      authProvider: string,
      state: AuthState,
    ): Promise<string> => {
      const response = await sdk.auth.authProviderLoginGet(authProvider, encodeAuthState(state));
      const redirectUrl = response.data.data?.redirectUrl;
      if (!redirectUrl) {
        throw new AuthRedirectUrlMissingError();
      }
      return redirectUrl;
    };

    const openExternalBrowser = async (url: string): Promise<void> => {
      await platformMatch({
        ios: async () => {
          const { InAppBrowser } = await import('@capacitor/inappbrowser');
          await InAppBrowser.openInExternalBrowser({ url });
        },
        default: async () => {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url });
        },
      });
    };

    const authViaNativeMobile = async (authProvider: string, state: AuthState): Promise<void> => {
      const redirectUrl = await fetchAuthRedirectUrl(authProvider, state);
      await openExternalBrowser(redirectUrl);
    };

    const authViaElectron = async (authUrl: string): Promise<void> => {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const result = await window.electron.auth(authUrl);
      if (result.error) {
        throw new Error(result.error);
      }
    };

    const authViaWeb = async (authProvider: string, state: AuthState): Promise<void> => {
      const redirectUrl = await fetchAuthRedirectUrl(authProvider, state);
      window.location.replace(redirectUrl);
    };

    const auth = async (params: AuthParams): Promise<void> => {
      if (!process.env.CLIENT) {
        return;
      }

      const state: AuthState = {
        environment: isAuthEnvironment(params.environment) ? params.environment : getEnvironment(),
        redirectUrl: params.redirectUrl,
      };
      const authUrl = getAuthUrl(params.provider, state);

      await platformMatch({
        nativeMobile: () => authViaNativeMobile(params.provider, state),
        electron: () => authViaElectron(authUrl),
        default: () => authViaWeb(params.provider, state),
      });
    };

    const authViaGithub = async (redirectUrl: string): Promise<void> => {
      await to(() => auth({ provider: provider.value ?? 'github', redirectUrl }))();
    };
    const isAuthError = (error: unknown): boolean => {
      const axiosError = error as { response?: { status: number } };
      const status = axiosError.response?.status;
      return status === 400 || status === 401;
    };

    const handleVerifyError = (error: unknown): void => {
      if (isAuthError(error)) {
        resetAuthInfo();
      }
    };

    const updateUserFromResponse = (userData: PersonalInfo | undefined): void => {
      if (!userData) {
        return;
      }
      user.value = userData;
    };

    const shouldSkipVerification = (): boolean => {
      return !process.env.CLIENT || !token.value;
    };

    const verifyUser = async (): Promise<void> => {
      if (shouldSkipVerification()) {
        resetAuthInfo();
        return;
      }

      const result = await to(() => sdk.auth.authVerifyGet())();

      if (result.isErr()) {
        handleVerifyError(result.error);
        return;
      }

      updateUserFromResponse(result.value.data.data);
    };

    const authUser = async (u: PersonalInfo, t: string): Promise<void> => {
      user.value = u;
      token.value = t;
    };

    const logout = async (): Promise<void> => {
      await to(() => sdk.auth.authLogoutGet())();
      resetAuthInfo();
      await api.vue.router.push({ name: RouteNames.Home });
    };

    const subscribe = async (subscriptionToken: string, email?: string): Promise<boolean> => {
      const sub = await to(sdk.auth.authSubscribePost)({ token: subscriptionToken, email });
      if (sub.isErr()) {
        reporter.reportError(sub.error);
        return false;
      }
      await verifyUser();
      return true;
    };

    const removeUserAccount = async (): Promise<void> => {
      if (user.value) {
        await sdk.auth.authAccountDelete();
      }
      localStorage.clear();
      await api.vue.router.push({ name: RouteNames.Home });
      window.location.reload();
    };

    return {
      token,
      user,
      provider,
      auth,
      authViaGithub,
      verifyUser,
      authUser,
      logout,
      subscribe,
      removeUserAccount,
    };
  },
  { persist: true },
);
