<template>
  <app-flex row align-center gap="xs" class="hotkey-input">
    <app-badge
      v-if="isRecording"
      class="recording-badge"
      size="sm"
      :variant="pending ? 'success' : 'info'"
    >
      {{ pending ? formatHotkey(pending) : '...' }}
    </app-badge>
    <app-badge v-else-if="!hasValue" size="sm" class="blank-badge">{{ t(I18N.BLANK) }}</app-badge>

    <template v-if="isRecording">
      <action-button icon="check" size="xs" :disabled="!pending" @click="confirm" />
      <action-button icon="close" size="xs" @click="cancel" />
    </template>
    <action-button v-else icon="add" size="sm" @click="startRecording" />
  </app-flex>
</template>

<script lang="ts" setup>
import { I18N, type Hotkey } from 'orgnote-api';
import AppBadge from './AppBadge.vue';
import AppFlex from './AppFlex.vue';
import ActionButton from './ActionButton.vue';
import { ref, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
import {
  formatHotkey,
  buildModifiersFromEvent,
  MODIFIER_KEY_NAMES,
} from 'src/utils/hotkey-display';

defineProps<{ hasValue?: boolean }>();
const emit = defineEmits<{ confirm: [hotkey: Hotkey] }>();

const isRecording = ref(false);
const pending = ref<Hotkey | undefined>();

const captureKey = (e: KeyboardEvent): void => {
  e.stopImmediatePropagation();
  e.preventDefault();
  if (MODIFIER_KEY_NAMES.has(e.key)) return;
  if (e.key === 'Escape') {
    cancel();
    return;
  }
  const modifiers = buildModifiersFromEvent(e);
  pending.value = { key: e.key, ...(modifiers.length ? { modifiers } : {}) };
};

const cleanup = (): void => {
  isRecording.value = false;
  pending.value = undefined;
  window.removeEventListener('keydown', captureKey, { capture: true });
};

const startRecording = (): void => {
  isRecording.value = true;
  pending.value = undefined;
  window.addEventListener('keydown', captureKey, { capture: true });
};

const confirm = (): void => {
  if (!pending.value) return;
  emit('confirm', pending.value);
  cleanup();
};

const cancel = (): void => cleanup();

onUnmounted(cleanup);
</script>

<style lang="scss" scoped>
.hotkey-input {
  --btn-action-hover-bg: var(--bg-hover);
}

.blank-badge {
  font-style: italic;
  opacity: 0.5;
}

.recording-badge {
  font-family: var(--code-font-family);
}
</style>
