<template>
  <app-flex row class="app-dropdown" v-bind="$attrs">
    <span v-if="label" class="dropdown-label">{{ label }}</span>
    <v-select
      ref="selectRef"
      v-model="model"
      :options="options"
      :label="optionLabel"
      :reduce="optionValue ? (opt: T) => getOptionValue(opt) : undefined"
      :placeholder="placeholder"
      :disabled="disable"
      :multiple="multiple"
      :clearable="false"
      :filterable="useInput"
      :searchable="useInput"
      :taggable="taggable"
      :close-on-select="!multiple"
      :input-id="inputId"
      :append-to-body="appendToBody"
      class="app-select"
    >
      <template v-if="slots.selected" #selected-option="scope">
        <slot name="selected" v-bind="scope" />
      </template>

      <template v-if="slots.option" #option="scope">
        <slot name="option" v-bind="scope" />
      </template>

      <template v-if="slots.noOption" #no-options>
        <slot name="noOption" />
      </template>

      <template v-if="clearable && hasSelection" #open-indicator="{ attributes }">
        <span v-bind="attributes" class="clear-button" @click.stop="clearSelection">
          <app-icon class="select-action" name="sym_o_close" size="sm" />
        </span>
      </template>

      <template v-else #open-indicator="{ attributes }">
        <span v-bind="attributes" class="dropdown-indicator">
          <app-icon class="select-action" name="sym_o_keyboard_arrow_down" size="sm" />
        </span>
      </template>
    </v-select>

    <app-flex v-if="slots.append" class="append-slot" align-center>
      <slot name="append" />
    </app-flex>
  </app-flex>
</template>

<script setup lang="ts" generic="T = unknown">
import { computed, ref, useSlots } from 'vue';
import { isPresent } from 'orgnote-api/utils';
// @ts-expect-error - vue-select beta doesn't have types yet
import VSelect from 'vue-select';
import AppIcon from 'src/components/AppIcon.vue';
import type { StyleVariant } from 'orgnote-api';
import AppFlex from './AppFlex.vue';
import 'vue-select/dist/vue-select.css';

interface Props {
  options: T[];
  optionLabel?: string;
  optionValue?: string | ((opt: T) => unknown);
  placeholder?: string;
  label?: string;
  type?: StyleVariant;
  disable?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  useInput?: boolean;
  taggable?: boolean;
  inputId?: string;
  appendToBody?: boolean;
}

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<Props>(), {
  type: 'plain',
  clearable: true,
  useInput: true,
  appendToBody: false,
});

const model = defineModel<T | T[] | null>();
const slots = useSlots();
type VueSelectRef = InstanceType<typeof VSelect> & {
  open?: boolean;
  searchEl?: HTMLInputElement;
};

const selectRef = ref<VueSelectRef>();

const hasSelection = computed(() => {
  const value = model.value;
  if (Array.isArray(value)) return value.length > 0;
  return isPresent(value);
});

const getOptionValue = (opt: T): unknown => {
  if (!props.optionValue) return opt;
  if (typeof props.optionValue === 'function') {
    return props.optionValue(opt);
  }
  return (opt as Record<string, unknown>)[props.optionValue];
};

const searchInput = () => selectRef.value?.searchEl;

const focus = () => {
  searchInput()?.focus();
};

const open = () => {
  focus();
  if (!selectRef.value) return;
  selectRef.value.open = true;
};

const blur = () => {
  searchInput()?.blur();
};

const clearSelection = () => {
  model.value = (props.multiple ? [] : null) as T[] | null;
};

defineExpose({
  focus,
  open,
  blur,
});
</script>

<style lang="scss">
.app-dropdown {
  width: 100%;
  min-height: var(--dropdown-height);
  gap: var(--dropdown-content-gap);
  border-radius: var(--dropdown-radius);

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: var(--dropdown-hover-bg);
    }
  }

  .dropdown-label {
    min-width: var(--dropdown-label-min-width);
    padding: var(--dropdown-option-padding-y) var(--dropdown-padding-x);
    white-space: nowrap;
  }

  .app-select {
    flex: 1;
    min-width: 0;
  }
}

.app-select {
  --vs-border-width: 0;
  --vs-border-radius: var(--dropdown-radius);
  --vs-dropdown-bg: var(--bg-elevated);
  --vs-search-input-bg: transparent;
  --vs-dropdown-option-padding: var(--dropdown-option-padding-y)
    var(--dropdown-option-padding-x);
  --vs-dropdown-option-color: var(--fg);
  --vs-search-input-color: var(--fg);
  --vs-selected-color: var(--fg);
  --vs-dropdown-box-shadow: none;
  --vs-actions-padding: 0;
  --vs-dropdown-option--active-bg: var(--bg-active);
  --vs-dropdown-option--active-color: var(--fg-active);

  background: transparent;

  .vs__dropdown-toggle {
    min-height: var(--dropdown-height);
    padding: 0 var(--dropdown-padding-x);
    column-gap: var(--dropdown-content-gap);
    box-sizing: border-box;
  }

  .vs__selected-options {
    min-width: 0;
    padding: 0;
    gap: var(--dropdown-content-gap);
    align-items: center;
  }

  .vs__selected {
    margin: 0;
    padding: 0;
  }

  &.vs--multiple .vs__selected {
    padding-inline: var(--dropdown-tag-padding-x);
  }

  .vs__search,
  .vs__search:focus {
    margin: 0;
    padding: 0;
  }

  .vs__actions {
    flex-shrink: 0;
  }

  .vs__dropdown-menu {
    padding: var(--dropdown-menu-padding-y) var(--dropdown-menu-padding-x);
    border: var(--glass-border);
    border-radius: var(--dropdown-menu-radius);
    box-shadow: var(--card-shadow);
    overflow: hidden;
  }

  .vs__dropdown-option {
    display: flex;
    align-items: center;
    min-height: var(--dropdown-height);
    padding: var(--vs-dropdown-option-padding);
    border-radius: var(--dropdown-option-radius);
    box-sizing: border-box;
    color: var(--vs-dropdown-option-color) !important;
  }

  .vs__no-options {
    padding: var(--dropdown-option-padding-y) var(--dropdown-option-padding-x);
  }

  .vs__dropdown-option--highlight,
  .vs__dropdown-option--selected {
    color: var(--vs-dropdown-option--active-color) !important;
    background: var(--vs-dropdown-option--active-bg) !important;
  }
}

.select-action {
  cursor: pointer;
}
</style>
