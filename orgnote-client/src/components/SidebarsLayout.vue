<template>
  <div class="sidebars-layout">
    <app-flex class="sidebars-layout-content" direction="row" start align-start>
      <div v-if="!isMobile && $slots.left" class="desktop-sidebar left">
        <slot name="left" />
      </div>

      <div class="main-content">
        <slot />
      </div>

      <div v-if="!isMobile && $slots.right && rightOpened" class="desktop-sidebar right">
        <slot name="right" />
      </div>
    </app-flex>

    <template v-if="isMobile">
      <div
        v-if="$slots.left"
        class="mobile-backdrop left"
        :class="{ visible: leftOpened || leftGesture.isDragging.value }"
        :style="leftBackdropStyle"
        @click="onCloseLeft"
      />
      <div
        v-if="$slots.left"
        class="mobile-sidebar left"
        :class="{ opened: leftOpened }"
        :style="leftDrawerStyle"
      >
        <slot name="left" />
      </div>

      <div
        v-if="$slots.right"
        class="mobile-backdrop right"
        :class="{ visible: rightOpened || rightGesture.isDragging.value }"
        :style="rightBackdropStyle"
        @click="onCloseRight"
      />
      <div
        v-if="$slots.right"
        class="mobile-sidebar right"
        :class="{ opened: rightOpened }"
        :style="rightDrawerStyle"
      >
        <slot name="right" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, type CSSProperties, toRef } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import { useDrawerGesture, type PanEventDetails } from 'src/composables/use-drawer-gesture';
import { useGlobalSwipe } from 'src/composables/use-global-swipe';
import { useAppResume } from 'src/composables/use-app-resume';

interface Props {
  leftOpened?: boolean;
  rightOpened?: boolean;
  leftWidth?: number;
  rightWidth?: number;
  isMobile?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  leftOpened: false,
  rightOpened: false,
  leftWidth: 360,
  rightWidth: 360,
  isMobile: false,
});

const emit = defineEmits<{
  openLeft: [];
  closeLeft: [];
  openRight: [];
  closeRight: [];
}>();

const leftGesture = useDrawerGesture({
  drawerWidth: props.leftWidth,
  opened: toRef(() => props.leftOpened),
  side: 'left',
  onOpen: () => emit('openLeft'),
  onClose: () => emit('closeLeft'),
});

const rightGesture = useDrawerGesture({
  drawerWidth: props.rightWidth,
  opened: toRef(() => props.rightOpened),
  side: 'right',
  onOpen: () => emit('openRight'),
  onClose: () => emit('closeRight'),
});

type DrawerSide = 'left' | 'right';

const createDrawerStyle = (
  isDragging: boolean,
  progress: number,
  side: DrawerSide,
): CSSProperties | undefined => {
  if (!isDragging) return undefined;

  const translateX = side === 'left' ? (progress - 1) * 100 : (1 - progress) * 100;

  return {
    transform: `translateX(${translateX}%)`,
    transition: 'none',
  };
};

const createBackdropStyle = (
  isDragging: boolean,
  progress: number,
  isOpened: boolean,
): CSSProperties => {
  const currentProgress = isDragging ? progress : isOpened ? 1 : 0;

  return {
    opacity: currentProgress,
    pointerEvents: currentProgress > 0 ? 'auto' : 'none',
    transition: isDragging ? 'none' : 'opacity 0.3s ease-out',
  };
};

const leftDrawerStyle = computed<CSSProperties | undefined>(() =>
  createDrawerStyle(leftGesture.isDragging.value, leftGesture.progress.value, 'left'),
);

const leftBackdropStyle = computed<CSSProperties>(() =>
  createBackdropStyle(leftGesture.isDragging.value, leftGesture.progress.value, props.leftOpened),
);

const rightDrawerStyle = computed<CSSProperties | undefined>(() =>
  createDrawerStyle(rightGesture.isDragging.value, rightGesture.progress.value, 'right'),
);

const rightBackdropStyle = computed<CSSProperties>(() =>
  createBackdropStyle(rightGesture.isDragging.value, rightGesture.progress.value, props.rightOpened),
);

const getActiveGesture = (direction?: string) => {
  if (leftGesture.isDragging.value) return leftGesture;
  if (rightGesture.isDragging.value) return rightGesture;
  if (props.leftOpened) return leftGesture;
  if (props.rightOpened) return rightGesture;
  if (direction === 'right') return leftGesture;
  if (direction === 'left') return rightGesture;
  return null;
};

const onPan = (details: PanEventDetails) => {
  getActiveGesture(details.direction)?.handlePan(details);
};

const resetDrawerGestures = (): void => {
  leftGesture.reset();
  rightGesture.reset();
};

const resetGestures = (): void => {
  resetDrawerGestures();
  swipe.reset();
};

const handleVisibilityChange = (): void => {
  if (document.visibilityState === 'hidden') {
    resetGestures();
  }
};

const swipe = useGlobalSwipe({
  onPan,
  enabled: () => props.isMobile,
  onCancel: resetDrawerGestures,
});

const stopResumeHandling = useAppResume(resetGestures);

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', resetGestures);
});

onUnmounted(() => {
  stopResumeHandling();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pagehide', resetGestures);
});

const onCloseLeft = () => {
  emit('closeLeft');
};

const onCloseRight = () => {
  emit('closeRight');
};
</script>

<style lang="scss" scoped>
.sidebars-layout {
  @include fit();
  position: relative;
  overflow: hidden;
}

.sidebars-layout-content {
  @include fit();
}

.main-content {
  height: 100%;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.desktop-sidebar {
  height: 100%;
  flex-shrink: 0;
}

.mobile-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--backdrop-bg);
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease-out;

  &.visible {
    pointer-events: auto;
  }
}

.mobile-sidebar {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 11;
  transition: transform 0.3s ease-out;
  will-change: transform;

  &.left {
    left: 0;
    width: var(--sidebar-width);
    transform: translateX(-100%);

    &.opened {
      transform: translateX(0);
    }
  }

  &.right {
    right: 0;
    width: 85vw;
    max-width: 400px;
    transform: translateX(100%);

    &.opened {
      transform: translateX(0);
    }
  }
}
</style>
