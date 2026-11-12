import type { OrgNoteSettings } from 'orgnote-api';
import { type SettingsStore } from 'orgnote-api';
import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import type { ModelsAPIToken } from 'orgnote-api/remote-api';
import { sdk } from 'src/boot/axios';
import { to } from 'orgnote-api/utils';
import { useAuthStore } from './auth';
import { useServerEnvironmentStore } from './server-environment';
import { canUseRemoteAccountFeatures } from 'src/utils/server-capabilities';

interface TokenRequestContext {
  readonly apiUrl: string;
  readonly userId: string | undefined;
  readonly authToken: string;
  readonly canManageTokens: boolean;
}

interface TokenOperationContext extends TokenRequestContext {
  readonly generation: number;
}

type TokenOperation = (context: TokenOperationContext) => Promise<void>;

const tokenContextsMatch = (
  first: TokenRequestContext,
  second: TokenRequestContext,
): boolean =>
  first.apiUrl === second.apiUrl &&
  first.userId === second.userId &&
  first.authToken === second.authToken &&
  first.canManageTokens === second.canManageTokens;

export const useSettingsStore = defineStore<'settings', SettingsStore>(
  'settings',
  () => {
    const tokens = ref<ModelsAPIToken[]>([]);

    const settings = reactive<OrgNoteSettings>({});

    const onboardingCompleted = ref(false);
    const onboardingCurrentStep = ref(0);

    const auth = useAuthStore();
    const serverEnvironment = useServerEnvironmentStore();
    const canManageTokens = computed(() =>
      canUseRemoteAccountFeatures(auth.user, serverEnvironment.isSelfHosted),
    );
    const tokenContext = computed<TokenRequestContext>(() => ({
      apiUrl: serverEnvironment.apiUrl,
      userId: auth.user?.id,
      authToken: auth.token,
      canManageTokens: canManageTokens.value,
    }));
    let contextGeneration = 0;
    let operationQueue = Promise.resolve();

    const captureTokenContext = (): TokenOperationContext => ({
      ...tokenContext.value,
      generation: contextGeneration,
    });
    const isCurrentContext = (context: TokenOperationContext): boolean =>
      context.generation === contextGeneration && tokenContextsMatch(context, tokenContext.value);

    const queueTokenOperation = (operation: TokenOperation): Promise<void> => {
      const context = captureTokenContext();
      const queuedOperation = operationQueue.then(async () => {
        if (!isCurrentContext(context)) return;
        await operation(context);
      });
      operationQueue = queuedOperation.then(
        () => undefined,
        () => undefined,
      );
      return queuedOperation;
    };

    const loadTokensForContext = async (context: TokenOperationContext): Promise<void> => {
      const result = await to(() => sdk.auth.authApiTokensGet())();
      if (result.isErr() || !isCurrentContext(context)) return;
      tokens.value = result.value.data.data ?? [];
    };

    const createTokenForContext = async (context: TokenOperationContext): Promise<void> => {
      const result = await to(() => sdk.auth.authTokenPost())();
      if (result.isErr() || !isCurrentContext(context)) return;
      const newToken = result.value.data.data;
      if (!newToken) return;
      tokens.value = [...tokens.value, newToken];
    };

    const removeTokenForContext = async (
      token: ModelsAPIToken,
      context: TokenOperationContext,
    ): Promise<void> => {
      const tokenId = token.id;
      if (!tokenId) return;
      const previousTokens = [...tokens.value];
      tokens.value = tokens.value.filter((currentToken) => currentToken.id !== tokenId);
      const result = await to(() => sdk.auth.authTokenTokenIdDelete(tokenId))();
      if (!result.isErr() || !isCurrentContext(context)) return;
      tokens.value = previousTokens;
    };

    const loadApiTokens = async (): Promise<void> => {
      if (!canManageTokens.value) {
        tokens.value = [];
        return;
      }
      await queueTokenOperation(loadTokensForContext);
    };

    const createApiToken = async (): Promise<void> => {
      if (!canManageTokens.value) return;
      await queueTokenOperation(createTokenForContext);
    };

    const removeApiToken = async (token: ModelsAPIToken): Promise<void> => {
      if (!canManageTokens.value || !token.id) return;
      await queueTokenOperation((context) => removeTokenForContext(token, context));
    };

    watch(
      tokenContext,
      () => {
        contextGeneration += 1;
        operationQueue = Promise.resolve();
        tokens.value = [];
        if (canManageTokens.value) void loadApiTokens();
      },
      { flush: 'sync' },
    );

    return {
      settings,
      tokens,
      onboardingCompleted,
      onboardingCurrentStep,
      loadApiTokens,
      createApiToken,
      removeApiToken,
    };
  },
  {
    persist: true,
  },
);
