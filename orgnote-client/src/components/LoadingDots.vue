<template>
  <div class="loading-dots" role="status" aria-live="polite">
    <span class="label">{{ label }}</span>
    <span class="dots">{{ dots }}</span>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { I18N } from 'orgnote-api';
import { isNullable } from 'orgnote-api/utils';

const props = defineProps<{
  messageKey?: I18N;
  text?: string;
}>();

const { t } = useI18n();

const label = computed(() => {
  if (props.text) return props.text;
  const key = props.messageKey ?? I18N.LOADING_MESSAGE_1;
  return t(key);
});

const dotCount = ref(0);
let timer: number | undefined;

const start = () => {
  if (isNullable(timer)) return;
  timer = window.setInterval(() => {
    dotCount.value = (dotCount.value + 1) % 4;
  }, 400);
};

const stop = () => {
  if (isNullable(timer)) return;
  window.clearInterval(timer);
  timer = undefined;
};

onMounted(start);
onUnmounted(stop);

const dots = computed(() => '.'.repeat(dotCount.value));
</script>

<style scoped lang="scss">
.loading-dots {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-xs);
  color: var(--fg-muted);
  font-size: var(--font-size-sm);
}

.label {
  color: var(--fg-muted);
}

.dots {
  width: 2ch;
  color: var(--fg-muted);
}
</style>
