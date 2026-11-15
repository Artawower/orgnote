<template>
  <app-flex column gap="md" class="graph-info-modal">
    <app-flex row center align-center gap="sm" class="stats">
      <app-badge :label="`${nodesCount} ${t(i18n.GRAPH_NODES_LABEL)}`" variant="accent" rounded />
      <app-badge :label="`${edgesCount} ${t(i18n.GRAPH_EDGES_LABEL)}`" variant="plain" rounded />
    </app-flex>

    <menu-group>
      <menu-item icon="sym_o_refresh" flat @click="props.refresh">
        {{ t(i18n.GRAPH_REFRESH) }}
      </menu-item>
      <menu-item icon="sym_o_restart_alt" class="reset-defaults" flat @click="resetConfig">
        {{ t(GRAPH_RESET_DEFAULTS_I18N_KEY) }}
      </menu-item>
    </menu-group>

    <menu-group>
      <menu-item v-for="field in configFields" :key="field.key" flat prefer="right">
        <span class="field-label">{{ camelCaseToWords(field.key) }}</span>
        <template #right>
          <input-field
            v-model.number="localConfig[field.key]"
            type="number"
            :name="field.key"
            size="sm"
            class="field-input"
          />
        </template>
      </menu-item>
    </menu-group>
  </app-flex>
</template>

<script lang="ts" setup>
import { nextTick, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { I18N as i18n } from 'orgnote-api';
import type { GraphUiConfig } from 'orgnote-api';
import AppBadge from 'src/components/AppBadge.vue';
import AppFlex from 'src/components/AppFlex.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import InputField from 'src/components/InputField.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';
import { DEFAULT_GRAPH_CONFIG } from 'src/constants/graph-defaults';

const props = defineProps<{
  nodesCount: number;
  edgesCount: number;
  config: GraphUiConfig;
  refresh: () => void;
  configChange: (config: GraphUiConfig) => void;
}>();

const GRAPH_RESET_DEFAULTS_I18N_KEY = 'graph.reset.defaults';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const localConfig = reactive<GraphUiConfig>({ ...props.config });
let isResettingConfig = false;

const configFields: Array<{ key: keyof GraphUiConfig }> = [
  { key: 'nodeRelSize' },
  { key: 'linkDistance' },
  { key: 'chargeStrength' },
  { key: 'warmupTicks' },
  { key: 'velocityDecay' },
  { key: 'initialZoom' },
  { key: 'labelFontSize' },
  { key: 'linkWidth' },
];

const resetConfig = (): void => {
  isResettingConfig = true;
  Object.assign(localConfig, DEFAULT_GRAPH_CONFIG);
  props.configChange({ ...DEFAULT_GRAPH_CONFIG });
  void nextTick(() => {
    isResettingConfig = false;
  });
};

watch(localConfig, (val) => {
  if (isResettingConfig) return;
  props.configChange({ ...val });
});
</script>

<style lang="scss" scoped>
.graph-info-modal {
  padding: var(--padding-md);
  min-width: var(--graph-modal-min-width);
}

.field-input {
  width: var(--graph-config-input-width);
}
</style>
