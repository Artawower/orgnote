<template>
  <app-flex
    class="error-display"
    :class="{ centered, 'full-width': fullWidth }"
    direction="column"
    justify="center"
    align="center"
  >
    <div class="error-container">
      <action-button
        v-if="copyable"
        :copy-text="errorText"
        icon="sym_o_content_copy"
        fire-icon="sym_o_local_fire_department"
        size="sm"
        class="copy-button"
        border
      />
      <app-flex
        v-if="Array.isArray(errors)"
        class="error-content"
        direction="column"
        justify="start"
        align="start"
        gap="sm"
      >
        <div v-for="(error, index) in errors" :key="index" class="error-message">
          {{ error }}
        </div>
      </app-flex>
      <app-flex
        v-else
        class="error-content"
        direction="column"
        justify="start"
        align="start"
        gap="sm"
      >
        <div class="error-message">
          {{ errors }}
        </div>
      </app-flex>
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import ActionButton from './ActionButton.vue';
import { computed } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = withDefaults(
  defineProps<{
    errors: string | string[];
    centered?: boolean;
    fullWidth?: boolean;
    copyable?: boolean;
  }>(),
  {
    centered: false,
    fullWidth: false,
    copyable: true,
  },
);

const errorText = computed(() => {
  return Array.isArray(props.errors) ? props.errors.join('\n') : props.errors;
});
</script>

<style lang="scss" scoped>
.error-display {
  @include fit;

  & {
    padding: var(--padding-lg);
  }

  &.centered {
    text-align: center;
  }

  &.full-width .error-container {
    max-width: unset;
  }
}

.error-container {
  position: relative;
  max-width: 600px;
  width: 100%;
  border: 1px solid var(--red);
  border-radius: var(--border-radius-md);
  background: color-mix(in srgb, var(--red), transparent 95%);
  padding: var(--padding-lg);

  @media (hover: hover) and (pointer: fine) {
    &:hover .copy-button {
      opacity: 1;
    }
  }
}

.copy-button {
  position: absolute;
  top: var(--padding-sm);
  right: var(--padding-sm);
  opacity: 0;
  transition: opacity 0.2s ease;
  background: var(--bg);
}

.error-message {
  color: color-mix(in srgb, var(--red), var(--fg) 30%);
  font-family: monospace;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-md);
  font-weight: var(--font-weight-regular);
  margin: 0;
}
</style>
