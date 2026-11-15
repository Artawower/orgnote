<template>
  <app-flex class="settings" row start align-start gap="lg">
    <visibility-wrapper desktop-above>
      <div class="menu">
        <div class="menu-inner">
          <settings-menu />
        </div>
      </div>
    </visibility-wrapper>
    <app-flex class="content" column start align-start gap="lg">
      <div class="content-inner">
        <component :is="currentView" />
      </div>
    </app-flex>
  </app-flex>
</template>

<script lang="ts">
import { RouteNames } from 'orgnote-api';
import type { Router } from 'vue-router';

export type TheSettingsModalProps = {
  initialRoute?: RouteNames;
  settingsRouter?: Router;
};
</script>

<script lang="ts" setup>
import { computed, watch } from 'vue';
import SettingsMenu from './SettingsMenu.vue';
import { to } from 'orgnote-api/utils';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { createSettingsRouter } from './modal-settings-routes';
import { useScreenDetection } from 'src/composables/use-screen-detection';
import { reporter } from 'src/boot/report';

const props = withDefaults(defineProps<TheSettingsModalProps>(), {
  initialRoute: RouteNames.SettingsPage,
});

const settingsRouter = props.settingsRouter ?? createSettingsRouter();

const { desktopBelow } = useScreenDetection();

const redirectSettingsMenuForDesktop = async (isDesktopBelow: boolean) => {
  if (isDesktopBelow || settingsRouter.currentRoute.value.name !== RouteNames.SettingsPage) {
    return;
  }

  const replaceResult = await to(() =>
    settingsRouter.replace({ name: RouteNames.SystemSettings }),
  )();

  if (replaceResult.isErr()) reporter.reportError(replaceResult.error);
};

watch(desktopBelow, (isDesktopBelow) => {
  void redirectSettingsMenuForDesktop(isDesktopBelow);
});

const currentView = computed(() => {
  return settingsRouter.currentRoute.value.matched[0]?.components?.default;
});

const navigate = (routeName: RouteNames) => {
  return to(() => settingsRouter.push({ name: routeName }))();
};

const resolvedInitialRoute =
  !desktopBelow.value && props.initialRoute === RouteNames.SettingsPage
    ? RouteNames.SystemSettings
    : props.initialRoute;

navigate(resolvedInitialRoute).then((result) => {
  if (result.isErr()) reporter.reportError(result.error);
});
</script>

<style lang="scss" scoped>
.settings {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;

  .menu,
  .content {
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }
}

.content {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.menu-inner,
.content-inner {
  padding: 0 var(--settings-padding) var(--settings-padding);
  width: 100%;
}

@include desktop {
  .menu-inner {
    padding-right: 0;
  }

  .content-inner {
    padding-left: 0;
  }
}

.settings :deep(.title),
.settings :deep(.description) {
  @include interactive-no-select;
}
</style>
