<template>
  <app-flex
    class="tab"
    :class="{ active, dragging: isDragging }"
    :draggable="canDrag"
    v-bind="{ [NAV_TAB_ID_ATTRIBUTE]: tabId }"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    row
    between
    align-center
    gap="sm"
  >
    <span class="tab-surface" aria-hidden="true" />
    <app-flex class="label" row start align-center gap="sm">
      <app-icon v-if="icon" :name="icon" size="xs" color="fg-muted" />
      <span class="label-text">
        <slot />
      </span>
    </app-flex>
    <action-button
      class="close-tab"
      @click.prevent.stop="emits('close')"
      icon="close"
      size="xs"
      color="fg-muted"
    />
  </app-flex>
</template>

<script lang="ts" setup>
import ActionButton from './ActionButton.vue';
import AppIcon from './AppIcon.vue';
import { computed, ref } from 'vue';
import { Platform } from 'quasar';
import { NAV_TAB_ID_ATTRIBUTE, ORGNOTE_TAB_FORMAT } from 'src/constants/orgnote-tab';
import AppFlex from 'src/components/AppFlex.vue';

const props = withDefaults(
  defineProps<{
    closable?: boolean;
    icon?: string;
    active?: boolean;
    tabId?: string;
    paneId?: string;
  }>(),
  {
    closable: true,
  },
);

const emits = defineEmits<{
  (e: 'close'): void;
  (e: 'dragstart', payload: { tabId: string; paneId: string }): void;
  (e: 'dragend'): void;
}>();

const isDragging = ref(false);

const canDrag = computed(() => !Platform.is.mobile && !!props.tabId && !!props.paneId);

const handleDragStart = (event: DragEvent) => {
  if (!canDrag.value || !props.tabId || !props.paneId) return;

  isDragging.value = true;
  emits('dragstart', { tabId: props.tabId, paneId: props.paneId });

  if (!event.dataTransfer) return;

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(
    ORGNOTE_TAB_FORMAT,
    JSON.stringify({ tabId: props.tabId, paneId: props.paneId }),
  );
};

const handleDragEnd = () => {
  isDragging.value = false;
  emits('dragend');
};
</script>

<style lang="scss" scoped>
.label,
.close-tab {
  position: relative;
  z-index: 1;
}

.close-tab {
  opacity: 0;
}

.tab {
  & {
    @include interactive-no-select;

    padding: var(--tab-padding);
    color: var(--tab-fg);
    width: var(--tab-width);
    min-width: var(--tab-min-width, 120px);
    flex-shrink: 0;
    cursor: pointer;
    height: var(--tab-height);
    box-sizing: border-box;
    position: relative;
    z-index: 0;
  }

  &:not(.active) {
    @include hover {
      .tab-surface {
        background: var(--tab-active-hover-bg);
      }
    }
  }

  &.dragging {
    opacity: 0.5;
  }

  @include hover {
    .close-tab {
      opacity: 1;
    }
  }

  &.active {
    .close-tab {
      opacity: 1;
    }
  }
}

.tab-surface {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: var(--tab-bg);
  border: var(--tab-border);
  border-radius: var(--tab-border-radius);
}

.tab.active {
  color: var(--tab-active-fg);
  z-index: 1;

  .tab-surface {
    inset: 0 0 calc(0px - var(--tab-connection-depth));
    background: var(--tab-active-bg);
    border: var(--tab-active-border);
    border-radius: var(--tab-active-border-radius);
  }

  .tab-surface::before,
  .tab-surface::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: var(--tab-active-radius);
    height: var(--tab-active-radius);
  }

  .tab-surface::before {
    left: calc(0px - var(--tab-active-radius));
    background: radial-gradient(
      circle at 0 0,
      transparent var(--tab-active-radius),
      var(--tab-active-bg) calc(var(--tab-active-radius) + 1px)
    );
  }

  .tab-surface::after {
    right: calc(0px - var(--tab-active-radius));
    background: radial-gradient(
      circle at 100% 0,
      transparent var(--tab-active-radius),
      var(--tab-active-bg) calc(var(--tab-active-radius) + 1px)
    );
  }

  .label-text {
    color: var(--tab-active-fg);
  }
}

.label-text {
  @include line-limit(1);
}
</style>
