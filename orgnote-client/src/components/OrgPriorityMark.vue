<template>
  <span class="mark" :class="`priority-${priority.toLowerCase()}`" @click="$emit('click')">
    [#{{ priority }}]
  </span>
</template>

<script lang="ts" setup>
defineProps<{ priority: string }>();
defineEmits<{ click: [] }>();
</script>

<style lang="scss" scoped>
.mark {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

@include org-priority-colors;
</style>
