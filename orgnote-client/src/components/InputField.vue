<template>
  <div class="input-field" :class="{ 'with-password-toggle': showPasswordToggle }">
    <app-input
      ref="inputRef"
      v-model="model"
      :text-right="textRight"
      :type="resolvedType"
      :name="name"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
    />
    <button
      v-if="showPasswordToggle"
      type="button"
      class="password-toggle"
      @click.stop.prevent="togglePasswordVisibility"
    >
      <app-icon :name="passwordToggleIcon" size="sm" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import AppInput from './AppInput.vue';

const props = withDefaults(
  defineProps<{
    textRight?: boolean;
    placeholder?: string;
    name?: string;
    type?: string;
    autocomplete?: string;
    passwordToggle?: boolean;
  }>(),
  {
    passwordToggle: false,
  },
);

const model = defineModel<string | number>();

const inputRef = ref<InstanceType<typeof AppInput> | undefined>();
const isPasswordVisible = ref(false);

const showPasswordToggle = computed(() => props.passwordToggle && props.type === 'password');

const resolvedType = computed(() => {
  if (!showPasswordToggle.value) return props.type;
  return isPasswordVisible.value ? 'text' : 'password';
});

const passwordToggleIcon = computed(() =>
  isPasswordVisible.value ? 'sym_o_visibility_off' : 'sym_o_visibility',
);

const togglePasswordVisibility = () => {
  isPasswordVisible.value = !isPasswordVisible.value;
};

const focus = () => {
  inputRef.value?.focus();
};

defineExpose({
  focus,
});
</script>

<style lang="scss" scoped>
.input-field {
  position: relative;
  width: 100%;

  &.with-password-toggle {
    :deep(input) {
      padding-right: calc(var(--btn-action-sm-size) + var(--padding-md));
    }
  }
}

.password-toggle {
  border: none;
  padding: 0;
  background: transparent;
  outline: none;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: var(--btn-action-sm-size);
  height: var(--btn-action-sm-size);
  border-radius: var(--border-radius-md);
  color: var(--fg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  @include hover {
    background: var(--btn-action-hover-bg);
  }
}
</style>
