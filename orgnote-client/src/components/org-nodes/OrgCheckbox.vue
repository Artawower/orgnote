<template>
  <app-checkbox v-model="checkboxValue"></app-checkbox>
</template>

<script lang="ts" setup>
import type { OrgNode } from 'org-mode-ast';
import AppCheckbox from 'src/components/AppCheckbox.vue';
import { ref, watch } from 'vue';

const props = defineProps<{ node: OrgNode }>();
const emits = defineEmits<{
  (e: 'update', newValue: string): void;
}>();

const checkboxValue = ref<boolean>(props.node.checked ?? false);

watch(
  () => checkboxValue.value,
  (newValue) => {
    emits('update', `[${newValue ? 'X' : ' '}]`);
  },
);
</script>

<style lang="scss">
.q-checkbox__inner--truthy .q-checkbox__bg,
.q-checkbox__inner--indet .q-checkbox__bg {
  background: var(--accent);
}

.q-checkbox__bg {
  border: 2px solid var(--accent);
}
</style>
