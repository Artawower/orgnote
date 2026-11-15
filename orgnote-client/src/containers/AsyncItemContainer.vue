<template>
  <div :style="{ height: typeof height === 'number' ? height + 'px' : height }">
    <template v-if="item">
      <slot :item="item" :index="index"></slot>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRef } from 'vue';

const props = defineProps<{
  index: number;
  itemsList: unknown[];
  height: string | number;
}>();

const itemsList = toRef(props, 'itemsList');

const item = computed(() => {
  const { index } = props;

  const item = itemsList.value[index];
  return item;
});
</script>
