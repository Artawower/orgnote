<template>
  <mini-editor
    :mode="props.mode"
    :title-placeholder="t(i18nKeys.orgAgendaQuickAddPlaceholder, { target: '' }).trim()"
    :body-placeholder="t(i18nKeys.orgAgendaQuickAddBodyPlaceholder)"
    @submit="emit('submit', $event)"
  >
    <template #schedule-sections>
      <agenda-repeat-picker
        :model-value="store.scheduled?.repeater"
        @update:model-value="setRepeater"
      />
      <app-flex
        v-if="props.mode === 'create' && store.scheduled?.repeater"
        row
        between
        align-center
        gap="sm"
        class="habit-row"
      >
        <app-flex row align-center gap="xs">
          <app-icon name="sym_o_repeat_on" size="sm" />
          <span>{{ t(i18nKeys.orgAgendaScheduleHabit) }}</span>
        </app-flex>
        <app-checkbox v-model="store.isHabit" />
      </app-flex>
    </template>

    <template v-if="props.mode === 'edit' && props.filePath" #footer-actions>
      <action-button
        :as="'div'"
        tabindex="-1"
        :aria-label="t(i18nKeys.orgAgendaToggleFullscreenEditor)"
        icon="sym_o_open_in_full"
        size="sm"
        @pointerdown.prevent.stop="toggleFullSize"
      />
      <action-button icon="sym_o_article" size="sm" @click="openFullEditor" />
    </template>
  </mini-editor>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns';
import type { OrgRepeater } from 'org-mode-ast';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { debounce } from 'src/utils/debounce';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppCheckbox from 'src/components/AppCheckbox.vue';
import MiniEditor from 'src/containers/MiniEditor/MiniEditor.vue';
import { useMiniEditorStore } from 'src/containers/MiniEditor/mini-editor-store';
import { openNoteAtPosition } from 'src/utils/editor-navigation';
import { useAgendaTaskEdit } from '../composables/use-agenda-task-edit';
import type { AgendaTaskView } from '../composables/use-agenda-tasks';
import type { CreateTaskInput } from 'orgnote-api/utils';
import { uint8ArrayToText, to, editOrgDocument } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import AgendaRepeatPicker from './AgendaRepeatPicker.vue';

const props = defineProps<{
  mode: 'create' | 'edit';
  task?: AgendaTaskView;
  filePath?: string;
}>();

const emit = defineEmits<{
  submit: [payload: CreateTaskInput];
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const store = useMiniEditorStore();
const { saveTask } = useAgendaTaskEdit();

const AUTOSAVE_DELAY = 600;

const loadBody = async (): Promise<void> => {
  if (!props.filePath || props.task?.start === undefined) return;
  const result = await to(api.core.useFileContent().read)(props.filePath);
  if (result.isErr()) {
    reporter.reportError(result.error);
    return;
  }
  const content = uint8ArrayToText(result.value);
  const start = props.task.start;
  let body = '';
  editOrgDocument(content, (doc) => {
    body = doc.headlineAt(start)?.body ?? '';
  });
  store.body = body;
};

const autoSave = debounce(async () => {
  if (props.mode !== 'edit' || !props.task || !props.filePath) return;
  await saveTask(props.task, props.filePath, {
    title: store.title,
    body: store.body,
    tags: store.tags,
    priority: store.priority,
    scheduled: store.scheduled,
  });
}, AUTOSAVE_DELAY);

onMounted(async () => {
  const unsubscribe = store.$subscribe(autoSave);
  onUnmounted(() => {
    unsubscribe();
    autoSave.cancel();
  });

  if (props.mode === 'edit' && props.task && !store.bodyLoaded) {
    await loadBody();
    store.bodyLoaded = true;
  }
});

const todayIsoDate = (): string => format(new Date(), 'yyyy-MM-dd');

const setRepeater = (repeater: OrgRepeater | undefined): void => {
  if (!store.scheduled && !repeater) return;
  store.scheduled = { date: store.scheduled?.date ?? todayIsoDate(), ...store.scheduled, repeater };
  if (!repeater) store.isHabit = false;
};

const toggleFullSize = (): void => {
  store.fullSize = !store.fullSize;
  api.ui.useModal().updateConfig({ fullScreen: store.fullSize });
};

const openFullEditor = (): void => {
  if (!props.filePath) return;
  api.ui.useModal().close();
  const task = props.task;
  if (task?.start !== undefined) {
    void openNoteAtPosition(api, props.filePath, task.start);
    return;
  }
  void api.core.useBufferViewer().open(props.filePath);
};
</script>

<style lang="scss" scoped>
.habit-row {
  padding-top: var(--padding-sm);
  border-top: var(--border-default);
  @include fontify(var(--font-size-sm), normal, var(--fg));
}
</style>
