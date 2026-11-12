<template>
  <app-flex column start align-stretch gap="sm" class="tasks-sidebar-calendar">
    <app-date-picker
      v-model="model"
      minimal
      :today-btn="false"
      :markers="markers"
      class="tasks-sidebar-calendar-picker"
    />
    <div class="tasks-sidebar-calendar-clear-slot">
      <app-button
        type="plain"
        outline
        class="tasks-sidebar-calendar-clear"
        :class="{ 'is-hidden': !model }"
        @click="clearDate"
      >
        {{ clearLabel }}
      </app-button>
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import type { DateMarker } from 'src/models/date-picker';
import AppDatePicker from 'src/components/AppDatePicker.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppButton from 'src/components/AppButton.vue';

defineProps<{
  clearLabel: string;
  markers: DateMarker[];
}>();

const model = defineModel<string | undefined>();

const clearDate = (): void => {
  if (!model.value) {
    return;
  }

  model.value = undefined;
};
</script>

<style lang="scss" scoped>
.tasks-sidebar-calendar {
  width: 100%;
  padding: var(--padding-sm);
}

.tasks-sidebar-calendar-picker,
.tasks-sidebar-calendar-clear {
  width: 100%;
}

.tasks-sidebar-calendar-clear {
  min-width: 0;
}

.tasks-sidebar-calendar-clear-slot {
  min-height: var(--menu-item-height-sm);
}

.tasks-sidebar-calendar-clear.is-hidden {
  visibility: hidden;
  pointer-events: none;
}
</style>
