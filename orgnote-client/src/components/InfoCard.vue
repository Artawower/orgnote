<template>
  <card-wrapper class="info-card" type="plain">
    <theme-variant :variant="type" class="info-card-content">
      <app-flex column center align-center gap="md">
        <app-icon v-if="icon" :name="icon" size="lg" />
        <h3 v-if="title" class="info-card-title">{{ title }}</h3>
        <p v-if="description" class="info-card-description">{{ description }}</p>
        <slot />
      </app-flex>
    </theme-variant>
  </card-wrapper>
</template>

<script lang="ts" setup>
import CardWrapper from 'src/components/CardWrapper.vue';
import AppIcon from 'src/components/AppIcon.vue';
import ThemeVariant from 'src/components/ThemeVariant.vue';
import type { StyleVariant } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';

withDefaults(
  defineProps<{
    icon?: string;
    title?: string;
    description?: string;
    type?: StyleVariant;
  }>(),
  {
    type: 'plain',
  },
);
</script>

<style lang="scss" scoped>
.info-card {
  & {
    padding: var(--padding-xl);
  }
}

.info-card-content {
  & {
    text-align: center;
    width: 100%;
    color: var(--variant-color);
  }
}

.info-card-title {
  @include fontify(var(--font-size-lg), var(--font-weight-medium), var(--variant-color));
}

.info-card-description {
  @include fontify(
    var(--font-size-md),
    var(--font-weight-normal),
    var(--variant-color-muted),
    var(--line-height-md)
  );
}
</style>
