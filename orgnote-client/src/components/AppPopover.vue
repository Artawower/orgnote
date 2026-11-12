<template>
  <div class="app-popover">
    <slot :toggle="toggle" />
    <q-popup-proxy
      v-model="isOpen"
      no-parent-event
      :breakpoint="breakpoint"
      :anchor="anchor"
      :self="self"
      @hide="emit('closed')"
    >
      <slot name="content" />
    </q-popup-proxy>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

withDefaults(
  defineProps<{
    breakpoint?: number;
    anchor?: string;
    self?: string;
  }>(),
  {
    breakpoint: 600,
    anchor: 'bottom left',
    self: 'top left',
  },
);

const emit = defineEmits<{ closed: [] }>();

const isOpen = ref(false);

const toggle = (): void => {
  isOpen.value = !isOpen.value;
};

const open = (): void => {
  isOpen.value = true;
};

const close = (): void => {
  isOpen.value = false;
};

defineExpose({ toggle, open, close });
</script>

<style lang="scss" scoped>
.app-popover {
  display: inline-flex;
  position: relative;
}
</style>
