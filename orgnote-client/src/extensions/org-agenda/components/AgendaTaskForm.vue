<template>
  <app-flex column align-stretch gap="none">
    <app-flex v-if="showTitleRow" row align-center gap="xs" class="input-row">
      <slot name="before-title" />
      <org-inline-editor
        ref="titleInputRef"
        v-model="title"
        :single-line="true"
        class="title-input"
        :placeholder="titlePlaceholder"
        @submit="$emit('submit')"
        @escape="$emit('cancel')"
        @expand="$emit('expand')"
        @update:model-value="$emit('update:title', $event)"
        @tag-click="onTagClick"
        @priority-click="openPriorityCompletion"
      />
      <slot name="title-actions" />
    </app-flex>

    <app-flex v-if="showBody" column gap="sm" align-stretch>
      <org-inline-editor
        ref="bodyInputRef"
        v-model="body"
        :placeholder="t(i18nKeys.orgAgendaQuickAddBodyPlaceholder)"
        class="body-area"
        @submit="$emit('submit')"
        @escape="$emit('cancel')"
        @blur="$emit('body-blur')"
      />
      <app-flex row align-start justify="between" class="toolbar">
        <app-flex row align-start gap="xs">
          <slot name="toolbar-start" />
          <action-button
            icon="sym_o_flag"
            size="sm"
            :active="!!selectedPriority"
            :aria-label="t(i18nKeys.orgAgendaQuickAddPriorityTooltip)"
            :class="selectedPriority ? `priority-${selectedPriority.toLowerCase()}` : ''"
            @click="openPriorityCompletion"
          />
          <action-button
            icon="sym_o_label"
            size="sm"
            :disabled="true"
            :aria-label="t(i18nKeys.orgAgendaQuickAddTagTooltip)"
          />
        </app-flex>

        <app-flex v-if="!hideSubmit" row align-center gap="md">
          <slot name="toolbar-end" />
          <app-button
            type="active"
            size="sm"
            :disabled="loading || !isSubmittable"
            @click="$emit('submit')"
          >
            {{ submitLabel ?? t(i18nKeys.orgAgendaQuickAddAddButton) }}
          </app-button>
        </app-flex>
      </app-flex>
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppFlex from 'src/components/AppFlex.vue';
import AppButton from 'src/components/AppButton.vue';
import ActionButton from 'src/components/ActionButton.vue';
import OrgInlineEditor from 'src/components/OrgInlineEditor.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { api } from 'src/boot/api';
import { isNullable } from 'orgnote-api/utils';
import { openOrgPriorityCompletion } from 'src/utils/org-priority-completion';
import { openOrgTagCompletion } from 'src/utils/org-tag-completion';
import {
  extractPriorityFromTitle,
  removePriorityFromTitle,
} from 'src/utils/org-editor/org-title-parser';

interface Props {
  showBody?: boolean;
  showTitleRow?: boolean;
  titlePlaceholder?: string;
  submitLabel?: string;
  loading?: boolean;
  hideSubmit?: boolean;
}

withDefaults(defineProps<Props>(), {
  showBody: true,
  showTitleRow: true,
  loading: false,
  hideSubmit: false,
});

defineEmits<{
  submit: [];
  cancel: [];
  expand: [];
  'body-blur': [];
  'update:title': [string];
}>();

const title = defineModel<string>('title', { required: true });
const body = defineModel<string>('body', { default: '' });
const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const titleInputRef = ref<InstanceType<typeof OrgInlineEditor> | null>(null);
const bodyInputRef = ref<InstanceType<typeof OrgInlineEditor> | null>(null);

const selectedPriority = computed(() => extractPriorityFromTitle(title.value)?.letter);

const isSubmittable = computed(() => removePriorityFromTitle(title.value).trim().length > 0);

const applyPriorityToTitle = (priority: string): void => {
  const stripped = removePriorityFromTitle(title.value);
  title.value = priority ? `[#${priority}] ${stripped}` : stripped;
};

const openPriorityCompletion = async (): Promise<void> => {
  const result = await openOrgPriorityCompletion(api, t);
  if (isNullable(result)) return;
  applyPriorityToTitle(result);
};

const onTagClick = async ({
  tag,
  replaceWith,
}: {
  tag: string;
  replaceWith: (newText: string) => void;
}): Promise<void> => {
  const newTag = await openOrgTagCompletion(api, t, tag);
  if (isNullable(newTag)) return;
  replaceWith(newTag);
};

defineExpose({
  focusTitle: () => titleInputRef.value?.focus?.(),
  focusBody: () => bodyInputRef.value?.focus?.(),
  blurTitle: () => titleInputRef.value?.blur?.(),
});
</script>

<style lang="scss" scoped>
.input-row {
  min-height: var(--control-height-md);
}

.title-input {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.date-trigger {
  display: inline-flex;
  cursor: pointer;
}

.body-area {
  min-height: calc(2 * var(--font-size-md) * 1.5 + var(--padding-xs) * 2);
}

.toolbar {
  padding-top: var(--gap-xs);
  border-top: var(--border-default);
}

@include org-priority-colors;
</style>
