<template>
  <context-menu :group="AGENDA_TASK_CONTEXT_MENU_GROUP" :data="data">
    <menu-item :capitalize="false" class="entry-row" :style="priorityBarStyle">
      <app-flex row align-center gap="sm" class="entry-content" @click.stop>
        <app-checkbox
          :model-value="checked"
          :class="priorityClass"
          :aria-label="toggleLabel"
          @change="emit('toggle')"
        />
        <slot />
      </app-flex>

      <template v-if="hasRightSlot" #right>
        <slot name="right" />
      </template>
    </menu-item>
  </context-menu>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue';
import ContextMenu from 'src/components/ContextMenu.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppCheckbox from 'src/components/AppCheckbox.vue';
import { AGENDA_TASK_CONTEXT_MENU_GROUP } from '../constants';

const props = withDefaults(
  defineProps<{
    data: unknown;
    checked: boolean;
    priority?: string;
    toggleLabel?: string;
  }>(),
  { priority: '', toggleLabel: '' },
);

const emit = defineEmits<{ toggle: [] }>();

const slots = useSlots();

const hasRightSlot = computed(() => !!slots.right);

const priorityClass = computed(() =>
  props.priority ? `priority-${props.priority.toLowerCase()}` : '',
);

const priorityBarStyle = computed(() => ({
  '--priority-bar-color': props.priority
    ? `var(--priority-${props.priority.toLowerCase()})`
    : 'transparent',
}));
</script>

<style lang="scss" scoped>
@include org-priority-colors(--checkbox-color);

.entry-row {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 2px;
    background: var(--priority-bar-color, transparent);
    pointer-events: none;
  }
}

.entry-content {
  flex: 1;
  min-width: 0;
}
</style>
