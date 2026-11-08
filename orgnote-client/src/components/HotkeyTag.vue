<template>
  <div class="hotkey-tag">
    <span class="label">{{ formatted }}</span>
    <action-button
      v-if="removable"
      icon="close"
      size="xs"
      flat
      class="remove"
      @click.stop="emit('remove')"
    />
  </div>
</template>

<script lang="ts" setup>
import type { Hotkey } from 'orgnote-api';
import ActionButton from './ActionButton.vue';
import { computed } from 'vue';
import { formatHotkey } from 'src/utils/hotkey-display';

const props = defineProps<{
  hotkey: Hotkey;
  removable?: boolean;
}>();

const emit = defineEmits<{ remove: [] }>();

const formatted = computed(() => formatHotkey(props.hotkey));
</script>

<style lang="scss" scoped>
.hotkey-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-xs);
  padding: var(--padding-xs) var(--padding-sm);
  background: color-mix(in srgb, var(--fg), transparent 88%);
  border-radius: var(--badge-radius);
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  user-select: none;
  line-height: 1;
  --btn-action-hover-bg: var(--bg-hover);
}

.label {
  padding: var(--padding-xs) 0;
}
</style>
