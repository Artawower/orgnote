<template>
  <label :class="{ checked: modelValue, disabled: disabled }">
    <input type="checkbox" :checked="modelValue" :disabled="disabled" @click.prevent="toggle" />
    <div class="box">
      <svg viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  </label>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', value: boolean): void;
}>();

const toggle = () => {
  if (props.disabled) return;
  const newValue = !props.modelValue;
  emit('update:modelValue', newValue);
  emit('change', newValue);
};
</script>

<style lang="scss" scoped>
label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  cursor: pointer;
  @include interactive-no-select;
  vertical-align: middle;
  position: relative;
  flex-shrink: 0;
}

input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--checkbox-bg-unchecked);
  border: var(--checkbox-border-width) solid var(--checkbox-border-color);
  border-radius: var(--checkbox-radius);
  transition: all var(--checkbox-transition-speed) ease;
  box-sizing: border-box;
}

svg {
  width: var(--checkbox-icon-size);
  height: var(--checkbox-icon-size);
  fill: none;
  stroke: var(--checkbox-icon-color);
  stroke-width: var(--checkbox-icon-stroke);
  stroke-linecap: round;
  stroke-linejoin: round;
  transform: var(--checkbox-icon-transform-unchecked);
  transition: transform var(--checkbox-transition-speed) ease;
}

label.checked .box {
  background: var(--checkbox-bg-checked);
  border-color: var(--checkbox-bg-checked);
}

label.checked svg {
  transform: var(--checkbox-icon-transform-checked);
}

label:hover:not(.disabled):not(.checked) .box {
  background: var(--checkbox-bg-hover-unchecked);
}

label.checked:hover:not(.disabled) .box {
  background: var(--checkbox-bg-hover-checked);
  filter: var(--checkbox-hover-filter);
}

label.disabled {
  cursor: not-allowed;
  opacity: var(--checkbox-disabled-opacity);
}

input:focus-visible + .box {
  box-shadow: var(--checkbox-focus-shadow);
}
</style>
