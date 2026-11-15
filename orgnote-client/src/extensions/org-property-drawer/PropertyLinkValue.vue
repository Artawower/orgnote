<template>
  <app-flex class="property-value link-value" start gap="sm">
    <span v-if="readonly">{{ displayed }}</span>
    <app-text-area
      v-else
      :model-value="item.value"
      class="property-value editing"
      :placeholder="t(I18N.EMPTY_VALUE_PLACEHOLDER)"
      :rows="1"
      @keydown.enter.stop.prevent="commit"
      @blur="commit"
    />
    <action-button
      v-if="canOpenLink"
      icon="sym_o_open_in_new"
      size="sm"
      color="fg-muted"
      @click.stop="openExternalUrl(item.value)"
    />
  </app-flex>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { OrgPropertyEntry } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppTextArea from 'src/components/AppTextArea.vue';
import { isOpenableExternalUrl, openExternalUrl } from 'src/utils/open-external-url';
import { truncateValue } from './property-value-utils';

const props = defineProps<{
  item: OrgPropertyEntry;
  readonly?: boolean;
}>();

const emit = defineEmits<{ set: [value: string] }>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const displayed = computed(() => truncateValue(props.item.value || t(I18N.EMPTY_VALUE_PLACEHOLDER)));
const canOpenLink = computed(() => isOpenableExternalUrl(props.item.value));

const commit = (event: Event): void => {
  if (!(event.target instanceof HTMLTextAreaElement)) return;
  emit('set', event.target.value);
};
</script>
