<template>
  <app-flex
    class="search-input"
    :class="[appearance, { 'no-icon': !icon }]"
    row
    between
    align-center
    gap="sm"
  >
    <app-icon v-if="icon" class="search-icon" :name="icon" size="md" color="fg" />
    <app-input
      ref="appInputRef"
      class="input"
      v-model="model"
      :autofocus="autofocus"
      :name="name"
      :type="type"
      :placeholder="placeholder && t(placeholder)"
    />
    <slot name="actions" />
    <action-button
      v-if="clearable && model"
      class="clear-action"
      @click="model = ''"
      icon="close"
      :size="size"
    />
  </app-flex>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ActionButton from './ActionButton.vue';
import AppFlex from './AppFlex.vue';
import AppIcon from './AppIcon.vue';
import AppInput from './AppInput.vue';
import type { StyleSize } from 'orgnote-api';

type InputAppearance = 'glass' | 'flat' | 'field';

withDefaults(
  defineProps<{
    name?: string;
    placeholder?: string;
    type?: string;
    clearable?: boolean;
    size?: StyleSize;
    icon?: string;
    appearance?: InputAppearance;
    autofocus?: boolean;
  }>(),
  {
    type: 'text',
    clearable: true,
    size: 'sm',
    appearance: 'flat',
  },
);

const model = defineModel<string>();

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const appInputRef = ref<InstanceType<typeof AppInput> | undefined>();

const focus = () => {
  appInputRef.value?.focus?.();
};

defineExpose({
  focus,
});
</script>

<style lang="scss" scoped>
.search-input {
  width: 100%;
  min-width: 0;
  @include glass-btn;

  &.glass {
    height: var(--bar-height);
    padding: 0 var(--padding-md);
    @include glass-surface;
    border-radius: var(--border-radius-xl);

    &.no-icon {
      padding-left: var(--padding-lg);
    }
  }

  &.field {
    height: var(--search-input-field-height);
    padding: var(--search-input-field-padding);
    background: var(--input-bg);
    border: var(--input-border);
    border-radius: var(--input-radius);
    box-shadow: var(--input-shadow);
    box-sizing: border-box;
    transition:
      background var(--input-transition),
      box-shadow var(--input-transition);

    @include hover {
      background: var(--input-hover-bg);
    }

    &:focus-within {
      background: var(--input-focus-bg);
      box-shadow: var(--input-focus-shadow);
    }
  }
}

.input {
  flex: 1 1 0;
  min-width: 0;
}

.clear-action {
  flex-shrink: 0;
}
</style>
