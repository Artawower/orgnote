<template>
  <app-flex class="property-value" start>
    <action-button :icon="icon" size="sm" color="fg" @click="toggle" />
  </app-flex>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrgPropertyEntry } from 'orgnote-api';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { formatBooleanValue, isTruthyPropertyValue } from './property-model';

const props = defineProps<{
  item: OrgPropertyEntry;
  readonly?: boolean;
}>();

const emit = defineEmits<{ set: [value: string] }>();

const icon = computed(() =>
  isTruthyPropertyValue(props.item.value) ? 'sym_o_check_box' : 'sym_o_check_box_outline_blank',
);

const toggle = (): void => {
  if (props.readonly) return;
  emit('set', formatBooleanValue(!isTruthyPropertyValue(props.item.value)));
};
</script>
