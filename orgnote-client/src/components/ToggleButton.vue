<template>
  <div class="toggle">
    <input :id="id ?? undefined" class="toggle-input" type="checkbox" v-model="model" />
    <label :for="id ?? undefined" class="toggle-label"></label>
  </div>
</template>

<script lang="ts" setup>
import { useId } from 'quasar';

const model = defineModel();
const id = useId();
</script>

<style lang="scss" scoped>
.toggle-input {
  opacity: 0;
  position: absolute;
  left: -9999px;
}

.toggle-label {
  cursor: pointer;
  display: inline-block;
  position: relative;
  height: var(--toggle-height);
  width: var(--toggle-width);
  background: var(--toggle-bg);
  border-radius: var(--toggle-radius);
  transition: var(--toggle-transition);
}

.toggle-label::before {
  content: '';
  position: absolute;
  display: block;
  height: var(--toggle-height);
  width: var(--toggle-height);
  top: 0;
  left: 0;
  border-radius: var(--toggle-radius);
  background: transparent;
  transition: 0.2s cubic-bezier(0.24, 0, 0.5, 1);
}

.toggle-label::after {
  content: '';
  position: absolute;
  display: block;
  height: var(--toggle-knob-size);
  width: var(--toggle-knob-size);
  top: var(--toggle-knob-offset);
  left: var(--toggle-knob-offset);
  border-radius: var(--toggle-radius);
  background: var(--toggle-knob-bg);
  box-shadow: var(--toggle-knob-shadow);
  transition: 0.35s cubic-bezier(0.54, 1.6, 0.5, 1);
}

.toggle-input:checked + .toggle-label::before {
  width: var(--toggle-width);
  background: var(--toggle-bg-checked);
  transition: width 0.2s cubic-bezier(0, 0, 0, 0.1);
}

.toggle-input:checked + .toggle-label::after {
  left: calc(var(--toggle-width) - var(--toggle-knob-size) - var(--toggle-knob-offset));
}
</style>
