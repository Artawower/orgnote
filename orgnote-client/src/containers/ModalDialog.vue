<template>
  <teleport to="body">
    <div
      class="modal-overlay"
      :class="{ 'no-backdrop': hideBackdrop }"
      @pointerdown="handleBackdropPointerDown"
      @pointerup="handleBackdropPointerUp"
    >
      <app-flex
        tag="div"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-label="dialogLabel"
        column
        start
        align-stretch
        :class="{
          mini: modalData.config?.mini,
          [`position-${modalData.config?.position ?? 'center'}`]:
            modalData.config?.position ?? 'center',
          'full-screen': modalData.config?.fullScreen,
          'modal-wide': modalData.config?.wide,
          'keyboard-fit': modalData.config?.mini && keyboardHeight > 0,
        }"
        class="modal-panel"
        ref="panelRef"
      >
        <app-flex
          :tag="modalData.config?.mini ? 'div' : SafeArea"
          column
          start
          align-stretch
          class="safe-area-wrapper"
        >
          <app-flex
            class="modal-content"
            column
            start
            align-start
            :gap="modalData.config?.noHeaderPadding ? '0px' : 'var(--modal-padding)'"
            :class="{ 'no-header-padding': modalData.config?.noHeaderPadding }"
          >
            <app-flex
              v-if="modalData.config?.headerTitleComponent || modalData.config?.title"
              class="modal-header"
              row
              between
              align-center
            >
              <component
                v-if="modalData.config?.headerTitleComponent"
                :is="modalData.config.headerTitleComponent"
              />
              <h1 v-else-if="modalData.config?.title" class="title capitalize">
                {{ t(modalData.config.title) }}
              </h1>
              <action-button @click="modal.close" icon="close" size="sm" />
            </app-flex>
            <div class="content">
              <app-flex
                column
                start
                align-stretch
                class="content-body"
                :class="{
                  'no-padding': modalData.config?.noBodyPadding,
                  'with-header':
                    modalData.config?.headerTitleComponent || modalData.config?.title,
                }"
              >
                <component
                  :is="modalData.component"
                  v-bind="modalData.config?.modalProps"
                  v-on="modalData.config?.modalEmits ?? {}"
                />
              </app-flex>
            </div>
          </app-flex>
        </app-flex>
      </app-flex>
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import type { Modal } from 'orgnote-api';
import { api } from 'src/boot/api';
import ActionButton from 'src/components/ActionButton.vue';
import SafeArea from 'src/components/SafeArea.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useScrollLock, useEventListener } from '@vueuse/core';
import { useKeyboardState } from 'src/composables/use-viewport-behavior';

const props = defineProps<{ modalData: Modal }>();

const modal = api.ui.useModal();
const panelRef = ref<InstanceType<typeof AppFlex>>();
const { keyboardHeight: keyboardHeightRef } = useKeyboardState();



const keyboardHeight = computed(() => keyboardHeightRef.value);
const hideBackdrop = computed(
  () => !!props.modalData.config?.fullScreen && !!props.modalData.config?.mini,
);

const getPanelElement = (): HTMLElement | undefined =>
  panelRef.value?.$el as HTMLElement | undefined;

// Replaces native <dialog>'s implicit background inertness (we render via Teleport).
const bodyScrollLocked = useScrollLock(document.body);

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

// Native <dialog> trapped focus for free; with a Teleport overlay we do it manually.
const trapFocus = (event: KeyboardEvent): void => {
  if (event.key !== 'Tab') return;
  const panel = getPanelElement();
  if (!panel) return;
  const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    modal.close();
    return;
  }
  trapFocus(event);
});

onMounted(() => {
  bodyScrollLocked.value = true;
  requestAnimationFrame(() => {
    const panel = getPanelElement();
    const target = panel?.querySelector<HTMLElement>('[autofocus]') ?? panel;
    target?.focus();
  });
});

onBeforeUnmount(() => {
  bodyScrollLocked.value = false;
});

// Close only when the gesture starts AND ends on the overlay itself, via a
// single pointer path (no @click) so one tap doesn't call close() twice.
const shouldCloseFromBackdrop = (event: Event) => event.target === event.currentTarget;

let backdropPointerDownId: number | null = null;

const handleBackdropPointerDown = (event: PointerEvent) => {
  backdropPointerDownId = shouldCloseFromBackdrop(event) ? event.pointerId : null;
};

const handleBackdropPointerUp = (event: PointerEvent) => {
  if (!shouldCloseFromBackdrop(event) || event.pointerId !== backdropPointerDownId) return;
  backdropPointerDownId = null;
  modal.close();
};

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

// Accessible name for role="dialog" (native <dialog> had implicit semantics).
const dialogLabel = computed(() =>
  props.modalData.config?.title ? t(props.modalData.config.title) : 'Dialog',
);
</script>

<style lang="scss" scoped>
// Teleport overlay instead of native <dialog> top-layer: toasts layer above it
// and positioning is fully controllable (no top-layer iOS-keyboard quirks).
.modal-overlay {
  // Height bound to --screen-height (stable visible area), NOT inset:0/innerHeight:
  // on iOS, focusing a lower editor balloons window.innerHeight while
  // --screen-height stays put — inset:0 made the overlay grow and the panel jump.
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--screen-height, 100vh);
  z-index: var(--modal-z-index);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--modal-backdrop-bg);

  &.no-backdrop {
    background-color: transparent;
  }
}

.modal-panel {
  min-width: var(--modal-min-width);
  max-width: var(--modal-max-width);
  max-height: var(--modal-max-height);
  margin: auto;
  border: var(--modal-border);
  border-radius: var(--modal-radius);
  padding: 0;
  background: var(--bg);
}

.modal-wide {
  width: var(--modal-max-width);

  @include tablet-above {
    height: var(--modal-max-height);
  }
}

:deep(.safe-area) {
  & {
    min-height: 0;
  }
}

@include desktop-below {
  .modal-panel {
    &:not(.mini) {
      width: 100%;
      border-radius: 0;
      height: calc(var(--initial-viewport-height, 100vh) - var(--keyboard-height, 0px));
      max-height: calc(var(--initial-viewport-height, 100vh) - var(--keyboard-height, 0px));
      margin: 0;
    }

    &.mini {
      margin-top: auto;
      margin-bottom: 0;
      width: 100%;
      height: fit-content;
      max-height: 85vh;
      border: none;
    }
  }
}

@include desktop-below {
  // compact + keyboard: margin-top:auto pins the panel to the overlay bottom
  // (= keyboard line, since overlay height is --screen-height) — flush, no gap.
  .modal-panel.mini.keyboard-fit:not(.full-screen) {
    margin-top: auto;
    margin-bottom: 0;
    background: transparent;
    box-shadow: none;

    // White card fills behind/under the keyboard (no seam): padding-bottom grows
    // the white area down, negative margin-bottom keeps the content pinned to the
    // keyboard line.
    .modal-content {
      flex: 0 0 auto;
      background: var(--bg);
      border-radius: var(--modal-radius);
      box-shadow: var(--shadow-lg);
      padding-bottom: var(--keyboard-height, 0px);
      margin-bottom: calc(-1 * var(--keyboard-height, 0px));
    }
  }

  .modal-panel.mini.keyboard-fit.full-screen {
    .modal-content {
      overflow: hidden;
    }

    .content {
      overflow-y: auto;
      overscroll-behavior-y: contain;
    }
  }
}

@include desktop {
  .modal-panel.position-top {
    margin-top: var(--padding-xl);
    margin-bottom: auto;
  }
}

.modal-panel.full-screen {
  width: 100%;
  height: var(--screen-height, 100vh);
  max-width: unset;
  max-height: var(--screen-height, 100vh);
  margin: 0;

  .safe-area-wrapper {
    height: 100%;
  }

  .modal-content,
  .content {
    flex: 1 1 auto !important;
    min-height: 0;
  }

  .content-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: hidden;
  }
}

.modal-content {
  & {
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    padding-bottom: var(--device-padding-bottom, 0px);
  }

  &:not(.no-header-padding) .modal-header {
    padding: var(--modal-padding);
    padding-bottom: 0;
  }

  div {
    width: 100%;
  }
}

.content {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;

  @include desktop-below {
    overscroll-behavior-y: contain;
  }
}

.content-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  width: 100%;

  &:not(.no-padding) {
    padding: var(--modal-padding);
  }

  &.with-header {
    padding-top: 0;
  }
}

.safe-area-wrapper {
  height: 100%;
}

@include desktop-below {
  .modal-panel.mini:not(.full-screen) {
    .safe-area-wrapper {
      height: auto;
    }

    .modal-content {
      flex: 0 0 auto;
    }

    .content {
      flex: 0 0 auto;
    }
  }
}

@include desktop {
  .safe-area-wrapper {
    height: 100%;
  }

  .modal-content {
    flex: 1 1 auto;
  }

  .content {
    flex: 1;
  }
}
</style>
