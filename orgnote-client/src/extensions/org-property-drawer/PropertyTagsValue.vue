<template>
  <app-flex class="property-value tags-value" start gap="xs">
    <app-flex v-for="tag in tags" :key="tag" class="tag-chip" start gap="xs">
      <span>{{ tag }}</span>
      <action-button
        v-if="!readonly"
        icon="sym_o_close"
        size="xs"
        color="fg-muted"
        hover-color="fg"
        :hover-background="false"
        @click="$emit('removeTag', tag)"
      />
    </app-flex>
    <app-input
      v-if="!readonly"
      v-model="draft"
      class="tag-input"
      placeholder="tag"
      @keydown.enter.stop.prevent="commit"
    />
  </app-flex>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { OrgPropertyEntry } from 'orgnote-api';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppInput from 'src/components/AppInput.vue';
import { parseTags } from './property-model';

const props = defineProps<{
  item: OrgPropertyEntry;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  removeTag: [tag: string];
  addTag: [tag: string];
}>();

const draft = ref('');

const tags = computed(() => parseTags(props.item.value));

const commit = (): void => {
  emit('addTag', draft.value);
  draft.value = '';
};
</script>
