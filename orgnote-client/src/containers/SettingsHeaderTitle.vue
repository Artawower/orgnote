<template>
  <header-wrapper>
    <visibility-wrapper v-if="currentRouteName !== RouteNames.SettingsPage" desktop-below>
      <navigation-history :router="settingsRouter" :on-return-back="handleReturnBack" />
    </visibility-wrapper>
    <h1 class="title capitalize">
      {{ camelCaseToWords(currentRouteName) }}
    </h1>
  </header-wrapper>
</template>

<script lang="ts" setup>
import { RouteNames } from 'orgnote-api';
import NavigationHistory from 'src/components/NavigationHistory.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import HeaderWrapper from 'src/components/HeaderWrapper.vue';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';
import { reporter } from 'src/boot/report';
import { to } from 'orgnote-api/utils';
import { computed, nextTick } from 'vue';
import type { Router } from 'vue-router';

const props = defineProps<{
  settingsRouter?: Router;
}>();

const settingsRouter = props.settingsRouter;
const currentRouteName = computed(() => settingsRouter?.currentRoute.value?.name?.toString());

const handleReturnBack = async () => {
  if (!settingsRouter) return;

  const routeBeforeBack = settingsRouter.currentRoute.value;
  const routePathBeforeBack = routeBeforeBack.fullPath;
  settingsRouter.back();
  await nextTick();

  const routeAfterBack = settingsRouter.currentRoute.value;
  const routePathAfterBack = routeAfterBack.fullPath;
  if (routePathAfterBack !== routePathBeforeBack) return;

  const fallbackResult = await to(() => settingsRouter.push({ name: RouteNames.SettingsPage }))();
  if (fallbackResult.isErr()) reporter.reportError(fallbackResult.error);
};
</script>

<style lang="scss" scoped>
.title {
  @include interactive-no-select;
}
</style>
