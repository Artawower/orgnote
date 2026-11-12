<template>
  <app-flex column align-stretch gap="xs" class="repeat-menu" :class="{ inline }">
    <app-flex
      v-for="preset in presets"
      :key="preset.key"
      row
      between
      align-center
      gap="sm"
      class="repeat-row repeat-option"
      :class="{ selected: isSelected(preset) }"
      role="button"
      tabindex="0"
      @click="emit('select', preset)"
      @keydown.enter.prevent="emit('select', preset)"
      @keydown.space.prevent="emit('select', preset)"
    >
      <app-flex row align-center gap="sm">
        <span class="option-dot" />
        <span>{{ t(i18nKeys[preset.labelKey]) }}</span>
      </app-flex>
      <app-icon v-if="isSelected(preset)" name="sym_o_check" size="sm" color="accent" />
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import type { OrgRepeater } from 'org-mode-ast';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import type { RepeatPreset } from './agenda-repeat-picker.types';

const props = withDefaults(
  defineProps<{
    presets: RepeatPreset[];
    modelValue?: OrgRepeater;
    inline?: boolean;
  }>(),
  {
    inline: false,
  },
);

const emit = defineEmits<{
  select: [preset: RepeatPreset];
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const matchesRepeater = (
  left: OrgRepeater | undefined,
  right: OrgRepeater | undefined,
): boolean => {
  if (!left || !right) return left === right;
  return left.type === right.type && left.value === right.value && left.unit === right.unit;
};

const isSelected = (preset: RepeatPreset): boolean => matchesRepeater(props.modelValue, preset.repeater);
</script>

<style lang="scss" scoped>
.repeat-menu {
  box-sizing: border-box;
  width: calc(var(--date-picker-sheet-width, 320px) - var(--padding-md));
  padding: var(--padding-xs) 0;
  border: var(--border-default);
  border-radius: var(--floating-border-radius);
  background: var(--bg);
  box-shadow: var(--floating-box-shadow);

  &.inline {
    width: 100%;
    margin-top: var(--padding-xs);
    box-shadow: none;
  }
}

.repeat-row {
  @include interactive-no-select;
  @include fontify(var(--font-size-sm), normal, var(--fg));

  min-height: var(--menu-item-height-sm);
  padding: var(--padding-sm) var(--padding-md);
  border-radius: var(--menu-item-radius);
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: var(--bg-hover);
    outline: none;
  }
}

.repeat-option.selected {
  color: var(--accent);
}

.option-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.45;
}
</style>
