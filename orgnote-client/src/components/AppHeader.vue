<template>
  <app-flex row space-between :class="{ float }" class="header-wrapper">
    <div class="header">
      <app-flex v-if="$slots.left" class="header-left float" row align-center center gap="sm">
        <slot name="left" />
      </app-flex>
      <app-flex v-if="$slots.center" class="header-center float" row center align-center>
        <slot name="center">
          <app-title v-if="title" :level="5" no-margin>{{ title }}</app-title>
        </slot>
      </app-flex>
      <app-flex v-if="$slots.right" class="header-right float" row align-center center gap="sm">
        <slot name="right" />
      </app-flex>
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';

defineProps<{
  title?: string;
  float?: boolean;
}>();
</script>

<style lang="scss" scoped>
.header-wrapper {
  width: 100%;
  background: var(--header-wrapper-bg);
  border-radius: var(--header-wrapper-border-radius);

  &.float {
    padding: var(--header-wrapper-padding);
  }
}

.header {
  display: grid;
  grid-template-columns:
    minmax(var(--header-item-height), max-content) minmax(0, 1fr)
    minmax(var(--header-item-height), max-content);
  align-items: center;
  column-gap: var(--header-column-gap, var(--padding-sm));
  width: 100%;
  min-height: var(--header-height);
  background: var(--header-bg);
  border: var(--header-border);
  border-radius: var(--header-border-radius);
  padding: var(--header-padding);
  box-sizing: border-box;
}

.header-left,
.header-center,
.header-right {
  min-width: var(--header-item-height);
  height: var(--header-item-height);
  background: var(--header-item-bg);
  border: var(--header-item-border);
  border-top: var(--header-item-border-top, var(--glass-border-top));
  border-radius: var(--header-item-border-radius);
  padding: var(--header-item-padding);
  -webkit-backdrop-filter: var(--header-item-backdrop-filter);
  backdrop-filter: var(--header-item-backdrop-filter);
  background-clip: padding-box;
  box-shadow: var(--header-item-box-shadow);

  --btn-action-radius: calc(var(--header-item-border-radius) - var(--padding-md));
  @include glass-btn;
  @include glass-specular;
}

.header-left {
  grid-column: 1;
  justify-self: start;
}

.header-center {
  grid-column: 2;
  min-width: 0;
  max-width: 100%;
  overflow: var(--header-item-center-overflow);
  justify-self: center;
  background: var(--header-item-center-bg);
  border: var(--header-item-center-border);
  border-top: var(--header-item-center-border-top);
  -webkit-backdrop-filter: var(--header-item-center-backdrop-filter);
  backdrop-filter: var(--header-item-center-backdrop-filter);
  box-shadow: var(--header-item-center-box-shadow);
}

.header-right {
  grid-column: 3;
  justify-self: end;
}
</style>
