<template>
  <transition
    :name="transitionName"
    :mode="transitionMode"
    :css="shouldUseCss"
    v-bind="slideHooks"
  >
    <slot />
  </transition>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount } from 'vue';
import { useConfigStore } from 'src/stores/config';

const props = withDefaults(
  defineProps<{
    animationName?: 'bounce' | 'fade' | 'slide';
    mode?: 'in-out' | 'out-in';
    css?: boolean;
  }>(),
  {
    animationName: 'fade',
    mode: 'out-in',
    css: true,
  },
);

const { config } = useConfigStore();

const isSlide = computed(() => props.animationName === 'slide');
const animationsEnabled = computed(() => config.ui.enableAnimations);
const shouldUseCss = computed(() => !isSlide.value && animationsEnabled.value && props.css);
const transitionMode = computed(() => (animationsEnabled.value ? props.mode : undefined));
const transitionName = computed(() =>
  animationsEnabled.value && !isSlide.value ? props.animationName : undefined,
);

const slideHooks = computed(() =>
  isSlide.value
    ? { onBeforeEnter, onEnter, onAfterEnter, onBeforeLeave, onLeave }
    : {},
);

const SLIDE_TRANSITION = 'height 220ms ease';

let pendingDone: (() => void) | null = null;

const clearSlideStyles = (el: HTMLElement): void => {
  el.style.height = '';
  el.style.overflow = '';
  el.style.transition = '';
};

const animateHeight = (el: HTMLElement, targetPx: number, done: () => void): void => {
  if (parseFloat(el.style.height) === targetPx) {
    done();
    return;
  }
  el.style.transition = SLIDE_TRANSITION;
  el.style.height = `${targetPx}px`;
  const onEnd = (e: TransitionEvent): void => {
    if (e.target !== el || e.propertyName !== 'height') return;
    el.removeEventListener('transitionend', onEnd);
    pendingDone = null;
    done();
  };
  pendingDone = () => el.removeEventListener('transitionend', onEnd);
  el.addEventListener('transitionend', onEnd);
};

onBeforeUnmount(() => {
  pendingDone?.();
  pendingDone = null;
});

const onBeforeEnter = (el: Element): void => {
  if (!animationsEnabled.value) return;
  (el as HTMLElement).style.height = '0';
  (el as HTMLElement).style.overflow = 'hidden';
};

const onEnter = (el: Element, done: () => void): void => {
  if (!animationsEnabled.value) { done(); return; }
  const htmlEl = el as HTMLElement;
  requestAnimationFrame(() => animateHeight(htmlEl, htmlEl.scrollHeight, done));
};

const onAfterEnter = (el: Element): void => {
  clearSlideStyles(el as HTMLElement);
};

const onBeforeLeave = (el: Element): void => {
  if (!animationsEnabled.value) return;
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = `${htmlEl.scrollHeight}px`;
  htmlEl.style.overflow = 'hidden';
};

const onLeave = (el: Element, done: () => void): void => {
  if (!animationsEnabled.value) { done(); return; }
  const htmlEl = el as HTMLElement;
  requestAnimationFrame(() => animateHeight(htmlEl, 0, done));
};
</script>

<style scoped>
.bounce-enter-active,
.bounce-leave-active {
  transition:
    transform 0.1s ease,
    opacity 0.1s ease;
}

.bounce-enter-from {
  transform: scale(0.5) rotate(-90deg);
  opacity: 0;
}

.bounce-enter-to {
  transform: scale(1) rotate(0);
  opacity: 1;
}

.bounce-leave-from {
  transform: scale(1) rotate(0);
  opacity: 1;
}

.bounce-leave-to {
  transform: scale(0.5) rotate(90deg);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
