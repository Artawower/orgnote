<template>
  <card-wrapper class="quick-add" :class="{ expanded: isExpanded }">
    <agenda-task-form
      ref="formRef"
      v-model:title="draft.title"
      v-model:body="draft.body"
      :show-body="isExpanded"
      :title-placeholder="quickAddTitlePlaceholder"
      :loading="loading"
      @submit="submitTask"
      @cancel="onFormCancel"
      @expand="expand"
      @update:title="onTitleInput"
    >
      <template #before-title>
        <app-badge
          :label="targetLabel"
          color="accent"
          size="xs"
          class="target-badge"
          @click="openFileCompletion"
        />
      </template>

      <template #title-actions>
        <agenda-schedule-button
          v-if="habitMode"
          v-model="draft.scheduled"
          v-model:habit="draft.isHabit"
          @closed="focusTitleInput"
        />
      </template>

      <template #toolbar-start>
        <action-button
          icon="sym_o_inbox"
          size="sm"
          :aria-label="t(i18nKeys.orgAgendaQuickAddTargetTooltip)"
          @click="openFileCompletion"
        />
      </template>

      <template #toolbar-end>
        <span class="hint">{{ quickAddShortcutHint }}</span>
      </template>
    </agenda-task-form>
  </card-wrapper>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useAgendaMiniEditor } from '../composables/use-agenda-mini-editor';
import { useI18n } from 'vue-i18n';
import type { FileMeta } from 'orgnote-api';
import CardWrapper from 'src/components/CardWrapper.vue';
import AppBadge from 'src/components/AppBadge.vue';
import ActionButton from 'src/components/ActionButton.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { api } from 'src/boot/api';
import { createAgendaFilesGetter } from '../utils/agenda-files-completion';
import { parseQuickAddInput } from '../utils/parse-quick-add-input';
import type { CreateTaskInput } from 'orgnote-api/utils';
import type { AgendaTaskDraft } from '../types';
import AgendaTaskForm from './AgendaTaskForm.vue';
import AgendaScheduleButton from './AgendaScheduleButton.vue';
import {
  extractPriorityFromTitle,
  removePriorityFromTitle,
} from 'src/utils/org-editor/org-title-parser';
import { fileBaseName } from 'src/utils/file-path';
import { todayIsoDate } from 'src/utils/org-date';

interface Props {
  agendaFilesPath: string;
  inboxFilePath: string;
  knownFiles?: string[];
  loading?: boolean;
  habitMode?: boolean;
  defaultDate?: string;
  defaultTargetFile?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  knownFiles: () => [],
  habitMode: false,
});

const emit = defineEmits<{
  submit: [payload: CreateTaskInput & { targetFile?: string }];
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const isExpanded = ref(false);
const targetFile = ref<string | undefined>(props.defaultTargetFile);
const isTildeCompletionOpen = ref(false);
const formRef = ref<InstanceType<typeof AgendaTaskForm> | null>(null);

const resolveDefaultSchedule = (): AgendaTaskDraft['scheduled'] => ({
  date: props.defaultDate ?? todayIsoDate(),
});

const lastUserSelectedSchedule = ref<AgendaTaskDraft['scheduled']>(resolveDefaultSchedule());

const draft = reactive<AgendaTaskDraft>({
  title: '',
  body: '',
  tags: [],
  priority: undefined,
  scheduled: resolveDefaultSchedule(),
  isHabit: props.habitMode,
});

watch(
  () => props.defaultDate,
  () => {
    if (props.habitMode) return;
    draft.scheduled = resolveDefaultSchedule();
  },
);

watch(
  () => props.defaultTargetFile,
  (filePath) => {
    targetFile.value = filePath;
  },
);

const inboxLabel = computed(() => fileBaseName(props.inboxFilePath));

const quickAddTitlePlaceholder = computed(() =>
  t(
    props.habitMode
      ? i18nKeys.orgAgendaQuickAddHabitPlaceholder
      : i18nKeys.orgAgendaQuickAddPlaceholder,
    { target: inboxLabel.value },
  ),
);

const quickAddShortcutHint = computed(() =>
  t(
    props.habitMode
      ? i18nKeys.orgAgendaQuickAddHabitShortcutHint
      : i18nKeys.orgAgendaQuickAddShortcutHint,
  ),
);

const targetLabel = computed(() =>
  targetFile.value ? fileBaseName(targetFile.value) : inboxLabel.value,
);

const { openCreate } = useAgendaMiniEditor();
const { tabletBelow } = api.ui.useScreenDetection();

const resolveDraftIsHabit = (): boolean => props.habitMode || draft.isHabit === true;

const focusTitleInput = (): void => {
  void nextTick(() => {
    requestAnimationFrame(() => formRef.value?.focusTitle());
  });
};

const setTargetFileAndFocus = (filePath: string): void => {
  targetFile.value = filePath;
  focusTitleInput();
};

const withHabitMode = (
  payload: CreateTaskInput & { targetFile?: string },
): CreateTaskInput & { targetFile?: string } =>
  props.habitMode ? { ...payload, isHabit: true } : payload;

const expand = async (): Promise<void> => {
  if (tabletBelow.value) {
    const result = await openCreate({
      title: draft.title,
      scheduled: draft.scheduled,
      isHabit: resolveDraftIsHabit(),
    });
    if (result) {
      emit('submit', withHabitMode({ ...result, targetFile: targetFile.value }));
      resetState();
    }
    return;
  }
  isExpanded.value = true;
  await nextTick();
  formRef.value?.focusBody();
};

const openFileCompletion = async (): Promise<void> => {
  const getter = createAgendaFilesGetter(api, props.agendaFilesPath, inboxLabel.value);
  const result = await api.core.useCompletion().open<FileMeta, string>({
    type: 'choice',
    placeholder: t(i18nKeys.orgAgendaQuickAddTargetPlaceholder),
    itemsGetter: getter,
  });
  if (!result) {
    focusTitleInput();
    return;
  }
  targetFile.value = result;
  focusTitleInput();
};

const openFileCompletionFromTilde = async (tildeIdx: number): Promise<void> => {
  const originalTitle = draft.title;
  const fragment = draft.title.slice(tildeIdx + 1);
  const getter = createAgendaFilesGetter(api, props.agendaFilesPath, inboxLabel.value);
  const result = await api.core.useCompletion().open<FileMeta, string>({
    type: 'choice',
    placeholder: t(i18nKeys.orgAgendaQuickAddTargetPlaceholder),
    itemsGetter: getter,
    searchText: fragment,
  });
  if (!result) {
    draft.title = originalTitle;
    focusTitleInput();
    return;
  }
  draft.title = draft.title.slice(0, tildeIdx).trimEnd();
  targetFile.value = result;
  focusTitleInput();
};

const onTitleInput = (): void => {
  if (isTildeCompletionOpen.value) return;
  const tildeIdx = draft.title.indexOf('~');
  if (tildeIdx === -1) return;
  isTildeCompletionOpen.value = true;
  openFileCompletionFromTilde(tildeIdx).finally(() => {
    isTildeCompletionOpen.value = false;
  });
};

const buildPayload = (): CreateTaskInput & { targetFile?: string } => {
  const rawTitle = removePriorityFromTitle(draft.title);
  const parsed = parseQuickAddInput(rawTitle, props.knownFiles);
  const resolvedTarget = targetFile.value ?? parsed.targetFile;
  const body = draft.body.trim() || parsed.body;
  const priority = extractPriorityFromTitle(draft.title)?.letter;
  return {
    title: parsed.title,
    ...(body ? { body } : {}),
    ...(draft.scheduled ? { scheduled: draft.scheduled } : {}),
    ...(resolveDraftIsHabit() ? { isHabit: true } : {}),
    ...(resolvedTarget ? { targetFile: resolvedTarget } : {}),
    ...(priority ? { priority } : {}),
  };
};

const resetState = (): void => {
  lastUserSelectedSchedule.value = draft.scheduled;
  draft.title = '';
  draft.body = '';
  draft.scheduled = props.habitMode
    ? (lastUserSelectedSchedule.value ?? resolveDefaultSchedule())
    : resolveDefaultSchedule();
  draft.isHabit = props.habitMode;
  isExpanded.value = false;
};

const submitTask = (): void => {
  const payload = buildPayload();
  if (!payload.title.trim()) return;
  emit('submit', payload);
  resetState();
  focusTitleInput();
};

const onFormCancel = (): void => {
  if (isExpanded.value) {
    isExpanded.value = false;
    return;
  }
  formRef.value?.blurTitle();
};

defineExpose({ setTargetFileAndFocus });
</script>

<style lang="scss" scoped>
.quick-add.card-wrapper {
  padding: var(--padding-sm) var(--padding-md);
  background: var(--input-bg);
  border: var(--input-border);
  border-radius: var(--input-radius);
  box-shadow: var(--input-shadow);
  transition:
    background var(--input-transition),
    box-shadow var(--input-transition);

  @include hover {
    background: var(--input-hover-bg);
  }

  &:focus-within {
    background: var(--input-focus-bg);
    box-shadow: var(--input-focus-shadow);
  }
}

.target-badge {
  cursor: pointer;
  flex-shrink: 0;
}

.hint {
  font-size: var(--font-size-xs);
  color: var(--fg-muted);
}
</style>
