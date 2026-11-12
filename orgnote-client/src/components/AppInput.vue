<template>
  <input
    ref="inputRef"
    :class="{ 'text-right': textRight }"
    :type="type"
    v-model="model"
    :name="name"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    :autofocus="autofocus"
    :disabled="disable"
  />
</template>

<script lang="ts" setup>
import { ref } from 'vue';

defineProps<{
  textRight?: boolean;
  placeholder?: string;
  name?: string;
  type?: string;
  autocomplete?: string;
  disable?: boolean;
  autofocus?: boolean;
}>();

const model = defineModel<string | number>();

const inputRef = ref<HTMLInputElement | undefined>();

const focus = () => {
  if (inputRef.value) {
    inputRef.value.focus();
  }
};

defineExpose({
  focus,
});
</script>

<style lang="scss" scoped>
input {
  color: var(--fg);
  border: none;
  background: transparent;
  width: 100%;

  @include reset-input();

  &::placeholder {
    color: var(--placeholder-fg);
  }
}
</style>
