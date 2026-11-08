<template>
  <app-popover ref="popoverRef" :breakpoint="0" class="property-key-popover">
    <app-input
      ref="inputRef"
      v-model="inputValue"
      class="input"
      :placeholder="placeholder"
      autocomplete="off"
      @focus="openOptions"
      @keydown.stop
      @keydown.enter.stop.prevent="confirm"
      @keydown.esc.prevent="cancel"
    />

    <template #content>
      <app-flex class="options" column align-stretch>
        <app-flex
          v-for="option in filteredOptions"
          :key="option"
          class="option"
          start
          gap="sm"
          @mousedown.prevent
          @click="selectOption(option)"
        >
          <app-icon :name="iconByOption(option)" size="sm" color="fg-muted" />
          <span>{{ option }}</span>
        </app-flex>
      </app-flex>
    </template>
  </app-popover>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppInput from 'src/components/AppInput.vue';
import AppPopover from 'src/components/AppPopover.vue';
import { getPropertyType } from './property-model';

const props = defineProps<{
  modelValue: string;
  options: readonly string[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  confirm: [];
  cancel: [];
}>();

const inputRef = ref<InstanceType<typeof AppInput>>();
const popoverRef = ref<InstanceType<typeof AppPopover>>();
const inputValue = ref(props.modelValue);

const filteredOptions = computed(() => {
  const query = inputValue.value.trim().toLowerCase();
  if (!query) return props.options;
  return props.options.filter((option) => option.toLowerCase().includes(query));
});

watch(
  () => props.modelValue,
  (value) => {
    if (value !== inputValue.value) inputValue.value = value;
  },
);

watch(inputValue, (value) => {
  emit('update:modelValue', value);
  openOptions();
});

const openOptions = (): void => {
  popoverRef.value?.open();
};

const closeOptions = (): void => {
  popoverRef.value?.close();
};

const selectOption = (option: string): void => {
  inputValue.value = option;
  emit('update:modelValue', option);
  closeOptions();
  emit('confirm');
};

const confirm = (): void => {
  closeOptions();
  emit('confirm');
};

const cancel = (): void => {
  closeOptions();
  emit('cancel');
};

const focus = (): void => {
  inputRef.value?.focus();
  openOptions();
};

const iconByOption = (option: string): string => {
  const type = getPropertyType(option);
  if (type === 'tags') return 'sym_o_sell';
  if (type === 'boolean') return 'sym_o_check_box';
  if (type === 'datetime') return 'sym_o_calendar_month';
  if (type === 'link') return 'sym_o_link';
  return 'sym_o_notes';
};

defineExpose({ focus });
</script>

<style scoped lang="scss">
.property-key-popover {
  width: inherit;
  max-width: inherit;
}

.input {
  height: 2rem;
  padding: 0 var(--padding-sm);
}

.options {
  width: 14rem;
  max-width: min(80vw, 20rem);
  max-height: 18rem;
  overflow-y: auto;
  padding: var(--padding-xs);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: var(--bg-elevated);
  color: var(--fg);
  box-shadow: var(--card-shadow);
}

.option {
  min-height: 2rem;
  padding: 0 var(--padding-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;

  @include hover {
    background: var(--bg-active);
    color: var(--fg-active);
  }
}
</style>
