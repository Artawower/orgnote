<template>
  <div class="wheel-picker">
    <div
      ref="viewport"
      class="viewport"
      role="listbox"
      tabindex="0"
      :aria-label="label"
      @scroll.passive="handleScroll"
      @keydown="handleKeydown"
    >
      <div
        v-for="(option, index) in options"
        :key="option.value"
        class="option"
        role="option"
        :data-value="option.value"
        :aria-selected="option.value === modelValue"
        @click="selectIndex(index)"
      >
        {{ option.label }}
      </div>
    </div>
    <app-input
      class="wheel-input"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      role="spinbutton"
      :maxlength="maximumInputLength"
      :aria-label="label"
      :aria-valuemin="minimumValue"
      :aria-valuemax="maximumValue"
      :aria-valuenow="modelValue"
      :aria-valuetext="selectedOption?.label"
      :model-value="inputValue"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      @input="handleInput"
      @keydown="handleInputKeydown"
      @wheel.prevent="handleInputWheel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppInput from './AppInput.vue';

interface WheelPickerOption {
  readonly value: number;
  readonly label: string;
}

const ITEM_HEIGHT = 44;
const SCROLL_SYNC_TOLERANCE = ITEM_HEIGHT / 2;
const PAGE_STEP = 3;
const DECIMAL_PATTERN = /^\d+$/;
const INPUT_KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowDown: -1,
  ArrowUp: 1,
};

const props = defineProps<{
  modelValue: number;
  options: readonly WheelPickerOption[];
  label: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const viewport = ref<HTMLElement>();
const inputDraft = ref('');
const isInputFocused = ref(false);
let animationFrame: number | undefined;

const selectedIndex = computed(() => {
  const index = props.options.findIndex((option) => option.value === props.modelValue);
  return Math.max(index, 0);
});
const selectedOption = computed(() => props.options[selectedIndex.value]);
const minimumValue = computed(() => Math.min(...props.options.map(({ value }) => value)));
const maximumValue = computed(() => Math.max(...props.options.map(({ value }) => value)));
const maximumInputLength = computed(() =>
  Math.max(...props.options.map(({ label }) => label.length)),
);
const inputValue = computed(() =>
  isInputFocused.value ? inputDraft.value : (selectedOption.value?.label ?? ''),
);

const clampIndex = (index: number): number => {
  const lastIndex = Math.max(props.options.length - 1, 0);
  return Math.min(Math.max(index, 0), lastIndex);
};

const getOptionElement = (element: HTMLElement, index: number): HTMLElement | undefined => {
  const option = element.children.item(clampIndex(index));
  return option instanceof HTMLElement ? option : undefined;
};

const getOptionScrollTop = (element: HTMLElement, index: number): number => {
  const option = getOptionElement(element, index);
  if (!option?.offsetHeight || !element.clientHeight) return clampIndex(index) * ITEM_HEIGHT;
  return option.offsetTop - (element.clientHeight - option.offsetHeight) / 2;
};

const scrollToIndex = (index: number): void => {
  const element = viewport.value;
  if (!element) return;
  const top = getOptionScrollTop(element, index);
  if (Math.abs(element.scrollTop - top) < SCROLL_SYNC_TOLERANCE) return;
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top });
    return;
  }
  element.scrollTop = top;
};

const selectIndex = (index: number): void => {
  const selected = props.options[clampIndex(index)];
  if (!selected) return;
  if (selected.value !== props.modelValue) emit('update:modelValue', selected.value);
  scrollToIndex(index);
};

const findOptionIndex = (input: string): number => {
  const value = input.trim();
  if (!DECIMAL_PATTERN.test(value)) return -1;
  return props.options.findIndex((option) => option.value === Number(value));
};

const selectInputIndex = (index: number): void => {
  const selected = props.options[clampIndex(index)];
  if (!selected) return;
  inputDraft.value = selected.label;
  selectIndex(index);
};

const handleInput = (event: Event): void => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  inputDraft.value = input.value;
  const index = findOptionIndex(input.value);
  if (index >= 0) selectIndex(index);
};

const handleInputFocus = (event: FocusEvent): void => {
  isInputFocused.value = true;
  inputDraft.value = selectedOption.value?.label ?? '';
  if (event.target instanceof HTMLInputElement) event.target.select();
};

const handleInputBlur = (): void => {
  isInputFocused.value = false;
  inputDraft.value = '';
};

const handleInputKeydown = (event: KeyboardEvent): void => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const step = INPUT_KEY_STEPS[event.key];
  if (!step) return;
  event.preventDefault();
  selectInputIndex(selectedIndex.value + step);
};

const handleInputWheel = (event: WheelEvent): void => {
  const step = Math.sign(event.deltaY);
  if (!step) return;
  selectInputIndex(selectedIndex.value + step);
};

const getCenteredOptionIndex = (element: HTMLElement): number => {
  if (!element.clientHeight) return Math.round(element.scrollTop / ITEM_HEIGHT);
  const viewportCenter = element.scrollTop + element.clientHeight / 2;
  return Array.from(element.children).reduce(
    (nearest, child, index) => {
      if (!(child instanceof HTMLElement)) return nearest;
      const distance = Math.abs(child.offsetTop + child.offsetHeight / 2 - viewportCenter);
      return distance < nearest.distance ? { index, distance } : nearest;
    },
    { index: 0, distance: Number.POSITIVE_INFINITY },
  ).index;
};

const updateSelectionFromScroll = (): void => {
  const element = viewport.value;
  if (!element) return;
  const selected = props.options[clampIndex(getCenteredOptionIndex(element))];
  if (selected && selected.value !== props.modelValue) emit('update:modelValue', selected.value);
};

const handleScroll = (): void => {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(updateSelectionFromScroll);
};

const KEY_INDEX_RESOLVERS: Readonly<Record<string, (index: number, last: number) => number>> = {
  ArrowUp: (index) => index - 1,
  ArrowDown: (index) => index + 1,
  PageUp: (index) => index - PAGE_STEP,
  PageDown: (index) => index + PAGE_STEP,
  Home: () => 0,
  End: (_index, last) => last,
};

const handleKeydown = (event: KeyboardEvent): void => {
  const resolveIndex = KEY_INDEX_RESOLVERS[event.key];
  if (!resolveIndex) return;
  event.preventDefault();
  selectIndex(resolveIndex(selectedIndex.value, props.options.length - 1));
};

watch(
  () => props.modelValue,
  () => nextTick(() => scrollToIndex(selectedIndex.value)),
);

onMounted(() => nextTick(() => scrollToIndex(selectedIndex.value)));

onBeforeUnmount(() => {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
});
</script>

<style scoped lang="scss" src="./wheel-picker.scss"></style>
