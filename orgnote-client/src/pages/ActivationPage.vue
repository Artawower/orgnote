<template>
  <div class="activation-page absolute-center">
    <template v-if="!user">
      <app-flex direction="column" gap="md" align="center">
        <h3 class="text-center">{{ t(I18N.AUTH_LOGIN_REQUIRED) }}</h3>
        <app-button type="info" @click="goToLogin">{{ t(I18N.AUTH_LOGIN) }}</app-button>
      </app-flex>
    </template>

    <template v-else-if="activating">
      <loading-dots :text="t(I18N.AUTH_ENTER_ACTIVATION_KEY)" />
    </template>

    <template v-else>
      <app-flex direction="column" gap="md" align="stretch">
        <h3 class="text-center">{{ t(I18N.AUTH_ENTER_ACTIVATION_KEY) }}</h3>

        <app-card v-if="errorMessage" type="danger">
          {{ errorMessage }}
        </app-card>

        <app-input v-model="key" :placeholder="t(I18N.SUBSCRIPTION_KEY)" autofocus />
        <app-input v-model="email" :placeholder="emailPlaceholder" />
        <app-flex direction="row" gap="md" justify="end">
          <app-button type="danger" @click="goHome">{{ t(I18N.CANCEL) }}</app-button>
          <app-button type="info" @click="activate" :disabled="!key">
            {{ t(I18N.ACTIVATE) }}
          </app-button>
        </app-flex>
      </app-flex>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { RouteNames, I18N } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { useI18n } from 'vue-i18n';
import { isAxiosError } from 'axios';
import { api } from 'src/boot/api';
import { sdk } from 'src/boot/axios';
import { storeToRefs } from 'pinia';
import AppButton from 'src/components/AppButton.vue';
import AppInput from 'src/components/AppInput.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppCard from 'src/components/AppCard.vue';
import LoadingDots from 'src/components/LoadingDots.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const authStore = api.core.useAuth();
const { user } = storeToRefs(authStore);

const userEmail = computed(() => user.value?.email || '');
const userIdentifier = computed(() => userEmail.value || user.value?.nickName || '');

const key = ref((route?.query?.key as string) ?? '');
const email = ref((route?.query?.email as string) ?? '');
const activating = ref(false);
const errorMessage = ref('');

const effectiveEmail = computed(() => email.value || userEmail.value);
const emailPlaceholder = computed(() =>
  userIdentifier.value ? `email (${userIdentifier.value})` : 'email',
);

const redirectUrl = computed(() => window.location.pathname + window.location.search);

type ActivationErrorResponse = {
  error?: string;
};

const backendActivationError = (error: unknown): string => {
  if (!isAxiosError<ActivationErrorResponse>(error)) {
    return '';
  }
  return error.response?.data?.error ?? '';
};

const activationErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error)) {
    return t(I18N.ACTIVATION_FAILED);
  }

  const status = error.response?.status;
  if (status === 404) {
    return t(I18N.ACTIVATION_KEY_NOT_FOUND);
  }
  if (status === 409) {
    return t(I18N.ACTIVATION_KEY_ALREADY_USED);
  }
  if (!status || status >= 500) {
    return t(I18N.ACTIVATION_SERVICE_UNAVAILABLE);
  }

  return backendActivationError(error) || t(I18N.ACTIVATION_FAILED);
};

const goHome = () => {
  router.push({ name: RouteNames.Home });
};

const goToLogin = () => {
  router.push({
    name: RouteNames.AuthPage,
    params: { initialProvider: 'github' },
    query: { redirectUrl: redirectUrl.value },
  });
};

const activate = async () => {
  if (!key.value) {
    return;
  }
  errorMessage.value = '';
  activating.value = true;
  const result = await to(sdk.auth.authSubscribePost)({ token: key.value, email: effectiveEmail.value });
  activating.value = false;
  if (result.isErr()) {
    errorMessage.value = activationErrorMessage(result.error);
    return;
  }

  await authStore.verifyUser();
  router.push({ name: RouteNames.Home });
};

onMounted(async () => {
  if (!user.value || !key.value) {
    return;
  }
  await activate();
});
</script>

<style lang="scss" scoped>
.activation-page {
  width: 480px;
  max-width: 100%;
  padding: var(--space-lg);
}
</style>
