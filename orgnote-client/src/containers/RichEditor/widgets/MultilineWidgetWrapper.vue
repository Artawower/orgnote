<template>
  <div class="org-multiline-widget">
    <app-flex v-if="showActions" end class="org-widget-actions" gap="sm">
      <action-button
        v-if="shouldShowEditAction"
        icon="edit_note"
        color="fg-muted"
        size="sm"
        @click="handleEditClick"
      />
      <slot name="actions" />
    </app-flex>
    <div class="org-multiline-widget-content">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = defineProps<{
  suppressEdit?: boolean;
  readonly?: boolean;
  showEditAction?: boolean;
}>();

const emit = defineEmits<{
  edit: [];
}>();

const slots = useSlots();
const shouldShowEditAction = computed(
  () => Boolean(props.showEditAction || !props.suppressEdit) && !props.readonly,
);
const showActions = computed(() => shouldShowEditAction.value || Boolean(slots.actions));

const handleEditClick = (event: MouseEvent) => {
  event.preventDefault();
  emit('edit');
};
</script>

<style lang="scss" scoped>
.org-multiline-widget {
  width: 100%;
}
.org-widget-actions {
  margin-bottom: var(--gap-xs);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.org-multiline-widget-content {
  width: 100%;
  min-width: 0;
}
@media (hover: hover) and (pointer: fine) {
  .org-multiline-widget:hover .org-widget-actions {
    opacity: 1;
    pointer-events: auto;
  }
}
.org-multiline-widget:active .org-widget-actions,
.org-multiline-widget:focus-within .org-widget-actions {
  opacity: 1;
  pointer-events: auto;
}
@media (max-width: 768px) {
  .org-widget-actions {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
