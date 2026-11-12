<template>
  <span v-if="readonly" class="property-value">
    {{ displayed }}
  </span>
  <app-text-area
    v-else
    :model-value="item.value"
    class="property-value editing"
    :placeholder="t(I18N.EMPTY_VALUE_PLACEHOLDER)"
    :rows="1"
    @keydown.enter.stop.prevent="commitAndExit"
    @blur="commit"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { OrgPropertyEntry } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import AppTextArea from 'src/components/AppTextArea.vue';
import { truncateValue } from './property-value-utils';

const props = defineProps<{
  item: OrgPropertyEntry;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  set: [value: string];
  enter: [];
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const displayed = computed(() => truncateValue(props.item.value || t(I18N.EMPTY_VALUE_PLACEHOLDER)));
const shouldSkipBlurCommit = ref(false);

const textAreaValue = (event: Event): string | undefined => {
  if (!(event.target instanceof HTMLTextAreaElement)) return undefined;
  return event.target.value;
};

const commitValue = (value: string | undefined): void => {
  if (value === undefined) return;
  emit('set', value);
};

const commit = (event: Event): void => {
  if (shouldSkipBlurCommit.value) {
    shouldSkipBlurCommit.value = false;
    return;
  }

  commitValue(textAreaValue(event));
};

const commitAndExit = (event: Event): void => {
  shouldSkipBlurCommit.value = true;
  commitValue(textAreaValue(event));
  emit('enter');
};
</script>
