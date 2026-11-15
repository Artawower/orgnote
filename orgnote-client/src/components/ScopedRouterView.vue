<template>
  <RouterView />
</template>

<script lang="ts" setup>
import { provide, type InjectionKey, type Ref } from 'vue';
import {
  RouterView,
  routerKey,
  routeLocationKey,
  routerViewLocationKey,
  viewDepthKey,
} from 'vue-router';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

const props = defineProps<{ router: Router }>();

provide(routerKey, props.router);

provide(
  routeLocationKey as unknown as InjectionKey<Ref<RouteLocationNormalizedLoaded>>,
  props.router.currentRoute,
);

provide(routerViewLocationKey, props.router.currentRoute);

provide(viewDepthKey, 0);
</script>
