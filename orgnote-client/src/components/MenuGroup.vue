<template>
  <section
    class="menu-group"
    role="group"
    :aria-labelledby="hasTitle ? titleId : undefined"
  >
    <div v-if="hasTitle" :id="titleId" class="menu-group-title">
      <slot name="title">{{ title }}</slot>
    </div>
    <div class="menu-group-items">
      <slot />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, useId, useSlots } from 'vue';

const props = defineProps<{
  title?: string;
}>();

const slots = useSlots();
const titleId = useId();
const hasTitle = computed(() => Boolean(props.title || slots.title));
</script>

<style lang="scss" scoped>
.menu-group {
  display: grid;
  width: 100%;
  min-width: 0;
  padding: var(--menu-group-padding);
  gap: var(--menu-group-gap);
  box-sizing: border-box;
  background: var(--menu-group-bg);
  border: var(--menu-group-border);
  border-radius: var(--menu-group-radius);
  box-shadow: var(--menu-group-shadow);
}

.menu-group-title {
  padding: var(--menu-group-title-padding);
  color: var(--menu-group-title-fg);
  font-size: var(--menu-group-title-font-size);
  font-weight: var(--menu-group-title-font-weight);
}

.menu-group-items {
  display: grid;
  gap: var(--menu-group-items-gap);
  min-width: 0;
}
</style>
