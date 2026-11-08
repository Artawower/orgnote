<template>
  <search-input
    ref="searchInputRef"
    class="completion-input"
    v-model="searchQuery"
    :placeholder="placeholder"
    icon="keyboard_arrow_right"
    :clearable="false"
    :autofocus="autofocus"
    @keypress.enter="handleCompletionInput"
  >
    <template #actions>
      <visibility-wrapper tablet-below>
        <action-button
          v-if="canAcceptAutocomplete"
          @click="completion.acceptAutocomplete()"
          icon="keyboard_tab"
          size="md"
          aria-label="Accept autocomplete"
        />
      </visibility-wrapper>
      <visibility-wrapper desktop-above>
        <action-button
          @click="toggleFullScreen"
          :icon="config?.fullScreen ? 'sym_o_close_fullscreen' : 'open_in_full'"
          size="sm"
        />
      </visibility-wrapper>
      <action-button @click="completion.close()" icon="close" size="md" />
    </template>
  </search-input>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import ActionButton from 'src/components/ActionButton.vue';
import SearchInput from 'src/components/SearchInput.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import { ref, computed } from 'vue';

defineProps<{
  placeholder?: string;
  fullScreen?: boolean;
  autofocus?: boolean;
}>();

const completion = api.core.useCompletion();

const searchQuery = computed({
  get: () => completion.activeCompletion?.searchQuery ?? '',
  set: (value: string) => {
    if (!completion.activeCompletion) return;
    completion.activeCompletion.searchQuery = value;
  },
});

const modal = api.ui.useModal();
const { config } = storeToRefs(modal);
const canAcceptAutocomplete = computed(() => completion.canAcceptAutocomplete());
const toggleFullScreen = () => {
  modal.updateConfig({
    fullScreen: !config.value?.fullScreen,
  });
};

const handleCompletionInput = async () => {
  const activeCompletion = completion.activeCompletion;
  if (!activeCompletion) return;

  const selectedIndex = activeCompletion.selectedCandidateIndex ?? 0;
  const selectedCandidate = activeCompletion.candidates?.[selectedIndex];

  if (activeCompletion.type === 'choice' && selectedCandidate) {
    selectedCandidate.commandHandler?.(selectedCandidate.data);
    return;
  }

  if (activeCompletion.type === 'input-choice' || activeCompletion.type === 'input') {
    await completion.close(activeCompletion.searchQuery);
    return;
  }
};

const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null);

const focusInput = () => {
  searchInputRef.value?.focus?.();
};

defineExpose({
  focusInput,
});
</script>

<style lang="scss" scoped>
.completion-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
}
</style>
