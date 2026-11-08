<template>
  <app-flex class="action-buttons" :column="vertical" :justify="justifyValue" align-center gap="sm">
    <slot />
  </app-flex>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = withDefaults(
  defineProps<{
    vertical?: boolean;
    horizontal?: boolean;
    position?: 'left' | 'right' | 'center';
  }>(),
  {
    position: 'left',
  },
);

const justifyMap: Record<string, 'start' | 'end' | 'center'> = {
  left: 'start',
  right: 'end',
  center: 'center',
};

const justifyValue = computed(() => justifyMap[props.position]);
</script>
