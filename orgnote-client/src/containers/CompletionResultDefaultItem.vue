<template>
  <app-flex class="default-item-content" direction="row" justify="start" align="center" gap="md">
    <component v-if="iconComponent" :is="iconComponent" size="sm" />
    <app-icon v-else-if="iconString" :name="iconString" size="sm" />
    <div class="text-medium color-main title-content">
      <div class="line-limit-1">
        {{ resolvedTitle }}
      </div>
    </div>
    <div class="description-content">
      <span class="text-italic color-secondary line-limit-1">
        {{ resolvedDescription }}
      </span>
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import type { CompletionItemRendererProps } from 'orgnote-api';
import { computed, toValue } from 'vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { useResolvedIcon } from 'src/composables/use-resolved-icon';

const props = defineProps<CompletionItemRendererProps>();

const resolvedTitle = computed(() => toValue(props.candidate.title));

const { iconString, iconComponent } = useResolvedIcon(
  computed(() => toValue(props.candidate.icon)),
);

const resolvedDescription = computed(() => toValue(props.candidate.description));
</script>

<style lang="scss" scoped>
.default-item-content {
  height: 100%;
  width: 100%;
  min-width: 0;
  text-align: left;
  box-sizing: border-box;
  padding: var(--completion-item-padding);
}

.title-content {
  flex: 1;
  min-width: 0;
}

.description-content {
  min-width: 0;
  flex: 0 1 45%;
}

@include mobile {
  .description-content {
    display: none;
  }
}
</style>