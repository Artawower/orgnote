<template>
  <card-wrapper class="stat-card" padding>
    <div class="stat-value">
      <slot name="value">{{ value }}</slot>
    </div>
    <div class="stat-label">
      <slot name="label">{{ label }}</slot>
    </div>
  </card-wrapper>
</template>

<script lang="ts" setup>
import CardWrapper from 'src/components/CardWrapper.vue';

defineProps<{
  label?: string;
  value?: string | number;
}>();
</script>

<style lang="scss" scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--fg-muted);
}
</style>
