<template>
  <app-flex
    :class="[`scope-${scope}`, { collapsed: isCollapsed }]"
    tabindex="-1"
    column
    align-stretch
    gap="xs"
    contenteditable="false"
    @mousedown.stop
    @click.stop
  >
    <app-flex
      v-if="isCollapsed"
      class="property-trigger"
      start
      gap="sm"
      @mousedown.stop.prevent
      @click.stop="expandPanel"
    >
      <app-icon name="sym_o_tune" size="sm" color="fg-muted" />
      <span class="property-title">{{ t(I18N.PROPERTIES) }}</span>
    </app-flex>

    <template v-else>
      <app-flex class="property-header" between align-center>
        <app-flex
          class="property-title-action"
          start
          gap="sm"
          @mousedown.stop.prevent
          @click.stop="togglePanel"
        >
          <app-icon name="sym_o_tune" size="sm" color="fg-muted" />
          <span class="property-title">{{ t(I18N.PROPERTIES) }}</span>
        </app-flex>
        <app-flex gap="xs">
          <action-button
            v-if="canCollapse"
            :icon="collapseIcon"
            size="sm"
            color="fg-muted"
            @click.stop="togglePanel"
          />
        </app-flex>
      </app-flex>

      <app-flex
        v-for="(item, index) in items"
        :key="item.key"
        class="property-row"
        :class="{ active: activePropertyRowIndex === index }"
        tabindex="0"
        align-center
        gap="md"
        @focusin="activatePropertyRow(index)"
        @keydown.capture="handlePropertyRowKeydown(index, $event)"
        @mousedown.stop
        @click.stop
      >
        <app-icon :name="iconByKey(item.key)" size="sm" color="fg-muted" />
        <template v-if="readonly">
          <span class="property-key">{{ item.key }}</span>
          <component :is="valueComponent(item)" :item="item" readonly />
        </template>
        <template v-else>
          <span class="property-key editing">
            <app-dropdown
              :ref="(control) => setPropertyRowFocusControl(index, control)"
              :model-value="item.key"
              :options="knownPropertyKeys"
              :taggable="true"
              :clearable="false"
              :placeholder="t(I18N.PROPERTY_PLACEHOLDER)"
              @update:model-value="setKey(item, $event)"
            >
              <template #selected="{ label }">
                <span class="property-key-label">{{ label }}</span>
              </template>
              <template #option="{ label }">
                <app-flex start gap="sm">
                  <app-icon :name="iconByKey(label)" size="sm" color="fg-muted" />
                  <span>{{ label }}</span>
                </app-flex>
              </template>
            </app-dropdown>
          </span>
          <component
            :is="valueComponent(item)"
            :item="item"
            @set="setValue(item.key, $event)"
            @enter="exitPropertyDrawerDown"
            @remove-tag="removeTag(item, $event)"
            @add-tag="addTag(item, $event)"
          />
        </template>

        <app-flex v-if="!readonly" class="property-actions" gap="xs">
          <action-button
            icon="sym_o_content_copy"
            size="sm"
            color="fg-muted"
            :copy-text="item.value"
          />
          <action-button
            icon="sym_o_delete"
            size="sm"
            color="fg-muted"
            @click.stop="removeProperty(item.key)"
          />
        </app-flex>
      </app-flex>

      <app-flex
        v-if="isAdding"
        class="property-row editing-row"
        :class="{ active: activePropertyRowIndex === draftPropertyRowIndex }"
        tabindex="0"
        align-center
        gap="md"
        @focusin="activatePropertyRow(draftPropertyRowIndex)"
        @keydown.capture="handlePropertyRowKeydown(draftPropertyRowIndex, $event)"
        @mousedown.stop
        @click.stop
      >
        <app-icon name="sym_o_notes" size="sm" color="fg-muted" />
        <span class="property-key editing" @keydown.esc="cancelEdit">
          <app-dropdown
            ref="addKeyInputRef"
            v-model="draftKey"
            :options="knownPropertyKeys"
            :taggable="true"
            :clearable="false"
            :placeholder="t(I18N.PROPERTY_PLACEHOLDER)"
            @update:model-value="focusValueInput"
          >
            <template #selected="{ label }">
              <span class="property-key-label">{{ label }}</span>
            </template>
            <template #option="{ label }">
              <app-flex start gap="sm">
                <app-icon :name="iconByKey(label)" size="sm" color="fg-muted" />
                <span>{{ label }}</span>
              </app-flex>
            </template>
          </app-dropdown>
        </span>
        <app-text-area
          ref="valueInputRef"
          v-model="draftValue"
          class="property-value editing"
          :placeholder="t(I18N.EMPTY_VALUE_PLACEHOLDER)"
          :rows="1"
          @keydown.enter.stop.prevent="commitEditAndExit"
          @keydown.esc.prevent="cancelEdit"
          @blur="commitEdit"
        />
        <app-flex class="property-actions" gap="xs">
          <action-button icon="sym_o_check" size="sm" color="fg-muted" @click.stop="commitEdit" />
          <action-button icon="sym_o_close" size="sm" color="fg-muted" @click.stop="cancelEdit" />
        </app-flex>
      </app-flex>

      <app-flex v-if="error" class="property-error" start>{{ error }}</app-flex>

      <action-button
        v-if="!readonly && !isAdding"
        icon="sym_o_add"
        size="sm"
        color="fg-muted"
        variant="text"
        alignment="left"
        @click.stop="startAdd"
      >
        <template #text>
          <span>{{ t(I18N.ADD_PROPERTY) }}</span>
        </template>
      </action-button>
    </template>
  </app-flex>
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import type { EditorView } from '@codemirror/view';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { I18N, isPresent } from 'orgnote-api';
import ActionButton from 'src/components/ActionButton.vue';
import AppDropdown from 'src/components/AppDropdown.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppTextArea from 'src/components/AppTextArea.vue';
import {
  EMBEDDED_WIDGET_COMMAND,
  EMBEDDED_WIDGET_DIRECTION,
  getEmbeddedWidgetBridge,
  type EmbeddedWidgetDirection,
  type EmbeddedWidgetFocusPosition,
} from 'src/utils/org-editor/embedded-widget-runtime';
import { getPropertyWidgetRange } from './property-source';
import { usePropertyDrawer } from './use-property-drawer';

const props = defineProps<{
  node: OrgNode;
  editorView: EditorView;
  rootNodeSrc: string;
  readonly?: boolean;
  openOnInit?: boolean;
}>();

interface FocusableControl {
  focus: () => void;
}

const PROPERTY_ROW_DIRECTION_BY_KEY: Readonly<Record<string, EmbeddedWidgetDirection | undefined>> = {
  ArrowDown: EMBEDDED_WIDGET_DIRECTION.Next,
  ArrowUp: EMBEDDED_WIDGET_DIRECTION.Previous,
};

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const activePropertyRowIndex = ref<number | null>(null);
const propertyRowFocusControls = ref<Array<FocusableControl | undefined>>([]);
let unregisterWidget: (() => void) | undefined;

const widgetId = `property-drawer:${props.node.start}`;

const currentPropertyRange = () => getPropertyWidgetRange(props.node);

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && isPresent(value);

const isFocusableControl = (control: unknown): control is FocusableControl =>
  isRecord(control)
  && typeof control.focus === 'function';

const activatePropertyRow = (rowIndex: number): void => {
  activePropertyRowIndex.value = rowIndex;
};

const setPropertyRowFocusControl = (rowIndex: number, control: unknown): void => {
  propertyRowFocusControls.value[rowIndex] = isFocusableControl(control)
    ? control
    : undefined;
};

const {
  addKeyInputRef,
  addTag,
  canCollapse,
  cancelEdit,
  collapseIcon,
  commitEdit,
  draftKey,
  draftValue,
  error,
  expandPanel,
  focusValueInput,
  iconByKey,
  isAdding,
  isCollapsed,
  items,
  knownPropertyKeys,
  readonly,
  removeProperty,
  removeTag,
  scope,
  setKey,
  setValue,
  startAdd,
  togglePanel,
  valueComponent,
  valueInputRef,
} = usePropertyDrawer(props);

const propertyRowCount = computed(() => items.value.length + (isAdding.value ? 1 : 0));
const draftPropertyRowIndex = computed(() => items.value.length);

const isVisiblePropertyRowIndex = (rowIndex: number): boolean =>
  rowIndex >= 0 && rowIndex < propertyRowCount.value;

const propertyRowIndexByPosition = (
  position: EmbeddedWidgetFocusPosition,
): number | undefined => {
  if (propertyRowCount.value === 0) return undefined;
  if (position === 'start') return 0;
  return propertyRowCount.value - 1;
};

const focusControl = (control: FocusableControl): void => {
  control.focus();
};

const focusableControlByRowIndex = (rowIndex: number): FocusableControl | undefined => {
  if (isAdding.value && rowIndex === draftPropertyRowIndex.value) return addKeyInputRef.value;
  return propertyRowFocusControls.value[rowIndex];
};

const focusPropertyRow = (rowIndex: number | undefined): boolean => {
  if (rowIndex === undefined || !isVisiblePropertyRowIndex(rowIndex)) return false;

  const control = focusableControlByRowIndex(rowIndex);
  activatePropertyRow(rowIndex);
  if (!control) return false;
  focusControl(control);
  return true;
};

const focusPropertyDrawerRow = (position: EmbeddedWidgetFocusPosition): boolean =>
  focusPropertyRow(propertyRowIndexByPosition(position));

const adjacentPropertyRowIndex = (
  rowIndex: number,
  direction: EmbeddedWidgetDirection,
): number | undefined => {
  const targetIndex = rowIndex + direction;
  if (!isVisiblePropertyRowIndex(targetIndex)) return undefined;
  return targetIndex;
};

const exitPropertyDrawer = (direction: EmbeddedWidgetDirection): void => {
  const range = currentPropertyRange();
  getEmbeddedWidgetBridge(props.editorView).dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Exit,
    payload: {
      sourceId: widgetId,
      range,
      direction,
    },
  });
};

const exitPropertyDrawerDown = (): void => {
  exitPropertyDrawer(EMBEDDED_WIDGET_DIRECTION.Next);
};

const handlePropertyRowKeydown = (rowIndex: number, event: KeyboardEvent): void => {
  const direction = PROPERTY_ROW_DIRECTION_BY_KEY[event.key];
  if (!direction) return;

  const targetRowIndex = adjacentPropertyRowIndex(rowIndex, direction);

  event.preventDefault();
  activatePropertyRow(rowIndex);

  if (focusPropertyRow(targetRowIndex)) return;
  exitPropertyDrawer(direction);
};

onMounted(() => {
  unregisterWidget = getEmbeddedWidgetBridge(props.editorView).register({
    id: widgetId,
    getRange: currentPropertyRange,
    focus: ({ position }) => focusPropertyDrawerRow(position),
  });
});

onBeforeUnmount(() => {
  unregisterWidget?.();
});

const commitEditAndExit = (): void => {
  commitEdit();
  exitPropertyDrawerDown();
};
</script>

<style scoped lang="scss">
.property-title {
  color: var(--fg-muted);
  font-size: inherit;
  font-weight: normal;
}

.property-trigger,
.property-title-action {
  color: var(--fg-muted);
  cursor: pointer;
}

.property-header {
  color: var(--fg-muted);
  padding-bottom: var(--padding-xs);
}

.property-row {
  --property-key-width: 10rem;
  --property-key-min-width: 6rem;

  min-width: 0;
  min-height: 2rem;
  padding: var(--padding-xs) var(--padding-sm);
  color: var(--fg);
  align-items: center;

  @include tablet-below {
    --property-key-width: 30%;
    --property-key-min-width: 0;
  }

  @include hoverable-area;

  .property-actions {
    @include hoverable-actions;
  }

  @include hover {
    .property-actions {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &:focus-within .property-actions,
  &.active .property-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

.editing-row .property-actions {
  opacity: 1;
}

.property-key {
  flex: 0 1 var(--property-key-width);
  width: var(--property-key-width);
  min-width: var(--property-key-min-width);
  max-width: var(--property-key-width);
  color: var(--fg-muted);

  @include overflow-ellipsis;
}

.property-value {
  flex: 1;
  min-width: 0;
  color: var(--fg);
  overflow-wrap: anywhere;
}

.editing-row {
  border-color: var(--border-color);
  background: var(--bg-elevated);
}

.editing {
  border: none;
  background: transparent;
  padding: 0;
}

.property-key.editing {
  display: flex;
  flex: 0 0 var(--property-key-width);
  align-items: center;
  width: var(--property-key-width);
  min-width: var(--property-key-min-width);
  max-width: var(--property-key-width);
  height: 2rem;
  min-height: 2rem;
  padding: 0;
  border: none;
  background: transparent;
  overflow: visible;
}

.property-error {
  color: var(--red);
  padding-top: var(--padding-xs);
}

.link-value {
  color: var(--accent);
}

.tags-value {
  flex-wrap: wrap;
}

.tag-chip {
  padding: 0 var(--padding-sm);
  border-radius: var(--border-radius-md);
  background: var(--bg-elevated);
  color: var(--accent);
}

.tag-input {
  max-width: 8rem;
}

.scope-headline:not(.collapsed) {
  border-left: 2px solid var(--border-color);
  padding-left: var(--padding-md);
}

.property-key.editing .app-dropdown {
  min-width: 0;
  width: 100%;
  max-width: 100%;
  max-height: none;
  border-radius: 0;
  background: transparent;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: transparent;
    }
  }
}

.property-key.editing .app-select {
  min-width: 0;
  padding: 0;
  --vs-font-size: var(--font-size-sm);
}

.property-key.editing :deep(.vs__dropdown-toggle),
.property-key.editing :deep(.vs__selected-options) {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.property-key.editing :deep(.vs__selected-options) {
  flex-wrap: nowrap;
}

.property-key-label {
  display: block;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  height: 2rem;
  line-height: 2rem;

  @include overflow-ellipsis;
}

.property-key.editing :deep(.vs__selected),
.property-key.editing :deep(.vs__search) {
  flex: 1 1 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.property-key.editing :deep(.vs__search) {
  padding: 0;
  line-height: 2rem;

  @include overflow-ellipsis;
}

:deep(.vs__selected-options) {
  padding: 0 !important;
}

:deep(.vs__selected) {
  margin: 0 !important;
  padding: 0 !important;
  height: 100%;
}

.property-key.editing :deep(.vs__selected) {
  border: 0 !important;
}
</style>
