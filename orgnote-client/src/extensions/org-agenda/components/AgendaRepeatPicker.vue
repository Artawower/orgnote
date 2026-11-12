<template>
  <app-flex v-if="desktopBelow" column align-stretch class="repeat-inline">
    <app-flex
      row
      between
      align-center
      gap="sm"
      class="repeat-row repeat-trigger"
      role="button"
      tabindex="0"
      @click="toggleInlineMenu"
      @keydown.enter.prevent="toggleInlineMenu"
      @keydown.space.prevent="toggleInlineMenu"
    >
      <app-flex row align-center gap="sm">
        <span class="icon-wrap">
          <app-icon name="sym_o_repeat" size="sm" />
        </span>
        <span>{{ t(i18nKeys.orgAgendaScheduleRepeat) }}</span>
      </app-flex>
      <app-flex row align-center gap="xs">
        <span class="repeat-label">{{ selectedLabel }}</span>
        <app-icon name="sym_o_keyboard_arrow_down" size="sm" />
      </app-flex>
    </app-flex>
    <agenda-repeat-options
      v-if="isInlineMenuOpen"
      :presets="repeatPresets"
      :model-value="model"
      inline
      @select="selectPreset"
    />
  </app-flex>

  <app-popover v-else ref="popoverRef" :breakpoint="0" class="repeat-popover">
    <template #default="{ toggle }">
      <app-flex
        row
        between
        align-center
        gap="sm"
        class="repeat-row repeat-trigger"
        role="button"
        tabindex="0"
        @click="toggle"
        @keydown.enter.prevent="toggle"
        @keydown.space.prevent="toggle"
      >
        <app-flex row align-center gap="sm">
          <span class="icon-wrap">
            <app-icon name="sym_o_repeat" size="sm" />
          </span>
          <span>{{ t(i18nKeys.orgAgendaScheduleRepeat) }}</span>
        </app-flex>
        <app-flex row align-center gap="xs">
          <span class="repeat-label">{{ selectedLabel }}</span>
          <app-icon name="sym_o_keyboard_arrow_down" size="sm" />
        </app-flex>
      </app-flex>
    </template>

    <template #content>
      <agenda-repeat-options
        :presets="repeatPresets"
        :model-value="model"
        @select="selectPreset"
      />
    </template>
  </app-popover>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { OrgRepeater } from 'org-mode-ast';
import { api } from 'src/boot/api';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppPopover from 'src/components/AppPopover.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import AgendaRepeatOptions from './AgendaRepeatOptions.vue';
import type { RepeatPreset } from './agenda-repeat-picker.types';

const model = defineModel<OrgRepeater | undefined>();
const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const { desktopBelow } = api.ui.useScreenDetection();
const popoverRef = ref<InstanceType<typeof AppPopover> | null>(null);
const isInlineMenuOpen = ref(false);

const repeatPresets: RepeatPreset[] = [
  { key: 'none', labelKey: 'orgAgendaScheduleRepeatNone' },
  {
    key: 'daily',
    labelKey: 'orgAgendaScheduleRepeatDaily',
    repeater: { type: '+', value: 1, unit: 'd' },
  },
  {
    key: 'weekly',
    labelKey: 'orgAgendaScheduleRepeatWeekly',
    repeater: { type: '+', value: 1, unit: 'w' },
  },
  {
    key: 'monthly',
    labelKey: 'orgAgendaScheduleRepeatMonthly',
    repeater: { type: '+', value: 1, unit: 'm' },
  },
  {
    key: 'yearly',
    labelKey: 'orgAgendaScheduleRepeatYearly',
    repeater: { type: '+', value: 1, unit: 'y' },
  },
];

const matchesRepeater = (
  left: OrgRepeater | undefined,
  right: OrgRepeater | undefined,
): boolean => {
  if (!left || !right) return left === right;
  return left.type === right.type && left.value === right.value && left.unit === right.unit;
};

const isSelected = (preset: RepeatPreset): boolean => matchesRepeater(model.value, preset.repeater);

const toggleInlineMenu = (): void => {
  isInlineMenuOpen.value = !isInlineMenuOpen.value;
};

const selectPreset = (preset: RepeatPreset): void => {
  model.value = preset.repeater;
  isInlineMenuOpen.value = false;
  popoverRef.value?.close();
};

const selectedLabel = computed(() => {
  const selected = repeatPresets.find(isSelected);
  if (selected) return t(i18nKeys[selected.labelKey]);
  const repeater = model.value;
  if (!repeater) return t(i18nKeys.orgAgendaScheduleRepeatNone);
  return `${repeater.type}${repeater.value}${repeater.unit}`;
});
</script>

<style lang="scss" scoped>
.repeat-popover,
.repeat-inline {
  width: 100%;
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

.repeat-trigger {
  width: 100%;
  background: transparent;
}

.icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--btn-action-sm-size);
  height: var(--btn-action-sm-size);
  color: var(--accent);
}

.repeat-label {
  color: var(--fg-muted);
}

</style>
