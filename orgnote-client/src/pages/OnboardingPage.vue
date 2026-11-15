<template>
  <safe-area v-if="!isNavigatingAway" class="onboarding-root" fit>
    <page-wrapper padding full-height constrained>
      <container-layout :body-scroll="true">
        <template #header>
          <app-flex center>
            <progress-dots :total-steps="steps.length" :current-step="currentStep" />
          </app-flex>
        </template>

        <app-flex row center fit full-width>
          <app-flex column gap="md" full-width>
            <component :is="currentStepConfig?.component" ref="currentStepRef" />
            <app-button v-if="canSkip" type="link" @click="skipSetup">
              {{ t(I18N.ONBOARDING_SKIP) }}
            </app-button>
          </app-flex>
        </app-flex>

        <template #footer>
          <app-flex center class="footer">
            <menu-group class="footer-card">
              <menu-item v-if="currentStep > 0" @click="goBack">
                {{ t(I18N.ONBOARDING_BACK) }}
              </menu-item>
              <menu-item
                :type="isLastStep ? 'active' : 'info'"
                @click="goNext"
                :disabled="!canProceed"
              >
                {{ isLastStep ? t(I18N.ONBOARDING_COMPLETED) : t(I18N.ONBOARDING_NEXT) }}
              </menu-item>
            </menu-group>
          </app-flex>
        </template>
      </container-layout>
    </page-wrapper>
  </safe-area>
  <modal-container />
</template>

<script lang="ts" setup>
import SafeArea from 'src/components/SafeArea.vue';
import PageWrapper from 'src/components/PageWrapper.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import ModalContainer from 'src/containers/ModalContainer.vue';
import ProgressDots from 'src/components/onboarding/ProgressDots.vue';
import WelcomeStep from 'src/components/onboarding/WelcomeStep.vue';
import FsSelectionStep from 'src/components/onboarding/FsSelectionStep.vue';
import ServerStep from 'src/components/onboarding/ServerStep.vue';
import EmacsStep from 'src/components/onboarding/EmacsStep.vue';
import AuthStep from 'src/components/onboarding/AuthStep.vue';
import ActivationStep from 'src/components/onboarding/ActivationStep.vue';
import SyncSetupStep from 'src/components/onboarding/SyncSetupStep.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppButton from 'src/components/AppButton.vue';

import { RouteNames } from 'orgnote-api/constants';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { api } from 'src/boot/api';
import { computed, ref, watch } from 'vue';
import { I18N } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import type { Component } from 'vue';
import { useServerEnvironmentStore } from 'src/stores/server-environment';
import { canUseRemoteAccountFeatures } from 'src/utils/server-capabilities';

interface StepConfig {
  component: Component;
  isCompleted?: () => boolean;
}

interface StepInstance {
  canProceed?: boolean;
}

const authStore = api.core.useAuth();
const { isSelfHosted } = storeToRefs(useServerEnvironmentStore());
const canUseRemoteFeatures = (): boolean =>
  canUseRemoteAccountFeatures(authStore.user, isSelfHosted.value);

const activationStep = {
  component: ActivationStep,
  isCompleted: () => !authStore.user || canUseRemoteFeatures(),
};
const syncSetupStep = { component: SyncSetupStep };

const subscriptionStep = computed<StepConfig>(() =>
  canUseRemoteFeatures() ? syncSetupStep : activationStep,
);

const steps = computed<StepConfig[]>(() => [
  { component: WelcomeStep },
  { component: FsSelectionStep },
  { component: ServerStep },
  { component: AuthStep, isCompleted: () => !!authStore.user },
  subscriptionStep.value,
  { component: EmacsStep, isCompleted: () => !authStore.user || canUseRemoteFeatures() },
]);

const router = useRouter();
const settings = api.core.useSettings();
const { onboardingCompleted, onboardingCurrentStep } = storeToRefs(settings);

const clampStep = (step: number): number => Math.max(0, Math.min(step, steps.value.length - 1));

const skipCompletedForward = (start: number): number => {
  let step = start;
  while (step < steps.value.length - 1 && steps.value[step]?.isCompleted?.()) step++;
  return step;
};

const currentStep = ref(skipCompletedForward(clampStep(onboardingCurrentStep.value)));
const currentStepRef = ref<StepInstance | null>(null);

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const isLastStep = computed(() => currentStep.value === steps.value.length - 1);
const currentStepConfig = computed(() => steps.value[currentStep.value]);

const canProceed = computed(() => {
  const step = currentStepRef.value;
  if (step?.canProceed !== undefined) return step.canProceed;
  return true;
});

const canSkip = computed(() => currentStep.value === 0);

const isNavigatingAway = ref(false);

const completeOnboarding = (): void => {
  isNavigatingAway.value = true;
  onboardingCompleted.value = true;
  onboardingCurrentStep.value = 0;
  router.push({ name: RouteNames.Home });
};

const initDefaultFsIfNeeded = async (): Promise<void> => {
  const fsManager = api.core.useFileSystemManager();
  const { currentFsName } = storeToRefs(fsManager);
  if (currentFsName.value) return;
  const [firstFs] = fsManager.fileSystems;
  if (!firstFs) return;
  await fsManager.useFs(firstFs.name);
};

const advanceIfCompleted = (): void => {
  const step = steps.value[currentStep.value];
  if (!step?.isCompleted?.()) return;

  if (isLastStep.value) {
    completeOnboarding();
    return;
  }
  currentStep.value++;
};

watch(currentStep, () => {
  onboardingCurrentStep.value = currentStep.value;
  advanceIfCompleted();
});

watch(steps, () => {
  currentStep.value = clampStep(currentStep.value);
  advanceIfCompleted();
});

advanceIfCompleted();

const goNext = (): void => {
  if (!canProceed.value) return;
  if (isLastStep.value) {
    completeOnboarding();
    return;
  }
  currentStep.value++;
};

const goBack = (): void => {
  let prev = currentStep.value - 1;
  while (prev > 0 && steps.value[prev]?.isCompleted?.()) prev--;
  currentStep.value = prev;
};

const skipSetup = async (): Promise<void> => {
  const result = await to(initDefaultFsIfNeeded)();
  if (result.isErr()) reporter.reportError(result.error);
  completeOnboarding();
};
</script>

<style lang="scss" scoped>
.onboarding-root {
  --page-max-width: min(100%, 38rem);
  --safe-area-top: var(--app-top-inset);
}

.footer {
  padding-top: var(--margin-sm);
}
</style>
