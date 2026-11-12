<template>
  <app-flex column align-center center gap="sm" class="empty-state">
    <app-icon v-if="icon" :name="icon" size="lg" class="icon" />
    <div v-if="title" class="title">{{ title }}</div>
    <div v-if="description" class="description">{{ description }}</div>
    <div v-if="$slots.default" class="footer">
      <slot />
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import AppFlex from './AppFlex.vue';
import AppIcon from './AppIcon.vue';

export interface EmptyStateProps {
  title?: string;
  icon?: string;
  description?: string;
}

defineProps<EmptyStateProps>();
</script>

<style lang="scss" scoped>
.empty-state {
  text-align: center;
  height: 100%;
}

.title {
  @include fontify(var(--font-size-lg), 600, var(--fg));
}

.description {
  @include fontify(var(--font-size-md), normal, var(--fg-muted));
  max-width: 400px;
}
</style>
