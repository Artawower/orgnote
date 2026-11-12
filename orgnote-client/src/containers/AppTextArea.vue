<template>
  <textarea
    v-model="model"
    ref="textareaRef"
    :placeholder="placeholder"
    name="edit mode"
  ></textarea>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

defineProps<{
  label?: string;
  placeholder?: string;
}>();

const model = defineModel<string>();
const textareaRef = ref<HTMLTextAreaElement | undefined>();

const focus = () => {
  textareaRef.value?.focus();
};

defineExpose({
  focus,
});
</script>

<style lang="scss" scoped>
textarea {
  flex: 1;
  margin-right: var(--padding-lg);
  color: var(--fg);
  border: none;
  background: transparent;

  @include reset-input();
}

textarea {
  width: 100%;
  flex: 1;
}
</style>
