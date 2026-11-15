<template>
  <div
    ref="sidebarRef"
    class="app-sidebar"
    :class="[side, { opened, 'has-mini': mini, resizable }]"
    :style="sidebarStyle"
  >
    <resize-splitter
      v-if="resizable && opened"
      class="splitter"
      absolute
      :active="resize.isResizing.value"
      @resize-start="resize.handleResizeStart"
    />

    <safe-area v-if="mini" class="mini-inset" :disable="!platform.is.electron">
      <app-flex class="mini-section" column between align-center>
        <div class="mini-top">
          <slot name="mini-top" />
        </div>
        <div class="mini-footer">
          <slot name="mini-footer" />
        </div>
      </app-flex>
    </safe-area>

    <safe-area :disable="platform.is.electron" top class="main-section">
      <div v-if="$slots.header" class="header">
        <slot name="header" />
      </div>
      <app-flex column start align-stretch class="content">
        <slot />
      </app-flex>
      <safe-area v-if="$slots.footer" bottom class="footer">
        <slot name="footer" />
      </safe-area>
    </safe-area>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import SafeArea from './SafeArea.vue';
import AppFlex from './AppFlex.vue';
import ResizeSplitter from './ResizeSplitter.vue';
import { useValueResize } from 'src/composables/use-value-resize';
import { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from 'src/constants/sidebar';
import { platform } from 'src/utils/platform-detection';

const props = withDefaults(
  defineProps<{
    side?: 'left' | 'right';
    opened?: boolean;
    mini?: boolean;
    resizable?: boolean;
    minWidth?: number;
    maxWidth?: number;
  }>(),
  {
    side: 'left',
    opened: true,
    mini: false,
    resizable: false,
    minWidth: SIDEBAR_MIN_WIDTH,
    maxWidth: SIDEBAR_MAX_WIDTH,
  },
);

const width = defineModel<number>('width');
const sidebarRef = ref<HTMLElement>();

const internalWidth = computed({
  get: () => width.value ?? sidebarRef.value?.offsetWidth ?? 0,
  set: (v: number) => (width.value = v),
});

const resize = useValueResize('horizontal', internalWidth, {
  min: props.minWidth,
  max: props.maxWidth,
  reverse: props.side === 'right',
  unit: 'pixel',
});

const sidebarStyle = computed(() => {
  if (!props.resizable || !width.value) return undefined;
  return { '--sidebar-content-width': `${width.value}px` };
});
</script>

<style lang="scss" scoped>
.app-sidebar {
  --btn-action-hover-bg: var(--sidebar-hover-bg);
  --bg-hover: var(--sidebar-hover-bg);
  --menu-item-hover-bg: var(--sidebar-hover-bg);
  --placeholder-fg: var(--sidebar-fg-muted);

  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: 100%;
  background: var(--sidebar-bg);
  overflow: hidden;

  * {
    color: var(--sidebar-fg);
  }

  &.left {
    border-right: var(--sidebar-border-right);

    .splitter {
      right: 0;
      left: auto;
    }
  }

  &.right {
    border-left: var(--sidebar-border-right);

    .splitter {
      left: 0;
      right: auto;
    }
  }
}

.mini-inset {
  --safe-area-top: var(--app-top-inset);
}

.mini-section {
  width: var(--sidebar-mini-width);
  height: var(--full-height);
  padding: var(--sidebar-padding);
  flex-shrink: 0;
}

.main-section {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-sidebar.opened .main-section {
  width: var(--sidebar-width);
}

.app-sidebar.opened.has-mini .main-section {
  width: calc(var(--sidebar-width) - var(--sidebar-mini-width));
}

.app-sidebar.opened.resizable .main-section {
  width: var(--sidebar-content-width, var(--sidebar-width));
}

.app-sidebar.opened.resizable.has-mini .main-section {
  width: calc(var(--sidebar-content-width, var(--sidebar-width)) - var(--sidebar-mini-width));
}

.app-sidebar:not(.opened) .main-section {
  width: 0;
}

.header {
  flex-shrink: 0;
  padding: var(--sidebar-padding);
  border-bottom: var(--border-default);
}

.content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.footer {
  flex-shrink: 0;
  border-top: var(--border-default);
}

@include tablet-below {
  .app-sidebar {
    width: 100%;
  }

  .app-sidebar.opened .main-section,
  .app-sidebar.opened.has-mini .main-section,
  .app-sidebar.opened.resizable .main-section,
  .app-sidebar.opened.resizable.has-mini .main-section {
    width: 100%;
  }

  .app-sidebar.has-mini .main-section {
    width: calc(100% - var(--sidebar-mini-width));
  }
}
</style>
