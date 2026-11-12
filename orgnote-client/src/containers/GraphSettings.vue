<template>
  <div class="graph-settings">
    <app-description padded>{{ t(I18N.GRAPH_SETTINGS_TITLE).toUpperCase() }}</app-description>
    <menu-group>
      <menu-item
        v-for="field in fields"
        :key="field.key"
        flat
        prefer="right"
      >
        {{ camelCaseToWords(field.key) }}
        <template #right>
          <input-field
            v-model.number="config.ui.graph[field.key]"
            type="number"
            :name="field.key"
          />
        </template>
      </menu-item>
    </menu-group>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import type { GraphUiConfig } from 'orgnote-api';
import AppDescription from 'src/components/AppDescription.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import InputField from 'src/components/InputField.vue';
import MenuItem from './MenuItem.vue';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const { config } = storeToRefs(api.core.useConfig());

const fields: Array<{ key: keyof GraphUiConfig }> = [
  { key: 'nodeRelSize' },
  { key: 'linkDistance' },
  { key: 'chargeStrength' },
  { key: 'warmupTicks' },
  { key: 'velocityDecay' },
  { key: 'initialZoom' },
  { key: 'labelFontSize' },
  { key: 'linkWidth' },
];
</script>

<style lang="scss" scoped>
.graph-settings {
  width: 100%;
}
</style>
