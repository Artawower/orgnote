<template>
  <component
    :is="rootComponent"
    class="spoiler"
    :class="[`variant-${variant}`, { scrollable }]"
    v-bind="rootProps"
  >
    <app-flex class="spoiler-header" @click="toggle" row between align-center gap="md">
      <div class="spoiler-title">
        <slot name="title" />
      </div>
      <app-flex class="spoiler-controls" row end align-center gap="xs">
        <app-flex
          v-if="$slots.actions"
          class="spoiler-actions"
          row
          end
          align-center
          @click.stop
        >
          <slot name="actions" />
        </app-flex>
        <app-icon
          name="sym_o_expand_more"
          size="sm"
          color="fg-muted"
          :class="{ rotated: expanded }"
          class="spoiler-icon"
        />
      </app-flex>
    </app-flex>
    <animation-wrapper animation-name="slide">
      <div
        v-if="expanded || keepMounted"
        class="spoiler-body"
        :class="{ 'no-padding': noPadding }"
        :hidden="keepMounted && !expanded"
      >
        <slot name="body" />
      </div>
    </animation-wrapper>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import CardWrapper from './CardWrapper.vue';
import AppIcon from './AppIcon.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AnimationWrapper from './AnimationWrapper.vue';

type AppSpoilerVariant = 'card' | 'card-static' | 'flat' | 'menu';

const props = withDefaults(
  defineProps<{
    defaultExpanded?: boolean;
    variant?: AppSpoilerVariant;
    noPadding?: boolean;
    keepMounted?: boolean;
    scrollable?: boolean;
  }>(),
  {
    defaultExpanded: false,
    variant: 'card',
  },
);

const model = defineModel<boolean | undefined>({ type: null });
const localExpanded = ref(props.defaultExpanded ?? false);
const expanded = computed(() => model.value ?? localExpanded.value);
const variant = computed(() => props.variant);
const isFlexVariant = computed(() => variant.value === 'flat' || variant.value === 'menu');
const rootComponent = computed(() => (isFlexVariant.value ? AppFlex : CardWrapper));
const rootProps = computed(() =>
  isFlexVariant.value
    ? { column: true, start: true, alignStretch: true }
    : { type: 'plain' },
);

watch(
  model,
  (newValue) => {
    if (newValue !== undefined) localExpanded.value = newValue;
  },
  { immediate: true },
);

const toggle = (): void => {
  const nextValue = !expanded.value;
  localExpanded.value = nextValue;
  model.value = nextValue;
};
</script>

<style scoped lang="scss">
.spoiler {
  transition: background-color 0.2s ease;

  &.variant-card,
  &.variant-card-static {
    overflow: hidden;
  }
}

.spoiler-header {
  padding: var(--padding-md);
  cursor: pointer;
  user-select: none;
}

.spoiler.variant-menu {
  gap: var(--menu-group-items-gap);
}

.spoiler.variant-menu .spoiler-header {
  min-height: var(--menu-item-min-height, var(--menu-item-height));
  border-radius: var(--menu-item-radius);
  padding:
    var(--menu-item-padding-top, var(--menu-item-padding-y))
    var(--menu-item-padding-x)
    var(--menu-item-padding-bottom, var(--menu-item-padding-y))
    var(--menu-item-padding-x);

  @include hover {
    background-color: var(--menu-item-hover-bg);
  }

  &:active {
    background-color: var(--menu-item-hover-bg);
  }
}

.spoiler-title {
  flex: 1;
  min-width: 0;
}

.spoiler-controls {
  flex-shrink: 0;
}

.spoiler-icon {
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.spoiler-icon.rotated {
  transform: rotate(180deg);
}

.spoiler-body {
  padding: var(--padding-md);
}

.spoiler.scrollable {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.spoiler.scrollable .spoiler-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.spoiler.variant-flat .spoiler-body,
.spoiler.variant-menu .spoiler-body,
.spoiler-body.no-padding {
  padding: 0;
}
</style>
