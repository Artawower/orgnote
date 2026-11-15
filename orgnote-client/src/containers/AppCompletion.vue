<template>
  <container-layout
    class="completion-wrapper"
    :class="{
      'full-screen': config?.fullScreen,
      'input-only': isInputOnly,
      'keyboard-anchored': isKeyboardAnchored,
    }"
    :reverse="shouldReverse"
    header-border
    footer-border
    body-scroll
  >
    <template #header>
      <app-flex class="header-stack" column gap="xs" full-width align-stretch>
        <app-flex class="header" row align-center full-width>
          <completion-input ref="completionInputRef" :placeholder="placeholder" :autofocus="true" />
        </app-flex>
        <error-display
          v-if="activeCompletion?.validationError"
          :errors="activeCompletion.validationError"
          :copyable="false"
          full-width
        />
      </app-flex>
    </template>
    <template v-if="!isInputOnly" #body>
      <div class="body">
        <completion-result
          v-if="activeCompletion?.candidates?.length"
          @select="handleResultSelect"
        />
        <app-flex
          v-else-if="isSearching"
          data-testid="completion-loading"
          class="not-found"
          row
          center
          align-center
          :style="{ height: completionItemHeight + 'px' }"
        >
          <q-spinner-dots size="2em" />
        </app-flex>
        <app-flex
          v-else
          class="not-found"
          row
          center
          align-center
          :style="{ height: completionItemHeight + 'px' }"
        >
          {{ t(I18N.NOT_FOUND).toUpperCase() }}
        </app-flex>
      </div>
    </template>
    <template v-if="!isInputOnly" #footer>
      <app-flex class="footer" row center align-center>
        {{ (activeCompletion?.selectedCandidateIndex ?? 0) + 1 }}/{{ activeCompletion?.total }}
      </app-flex>
    </template>
  </container-layout>
</template>

<script lang="ts" setup>
import { I18N, KEYBINDING_CONTEXTS, type CompletionConfig } from 'orgnote-api';
import CompletionInput from './CompletionInput.vue';
import { ref, computed, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import CompletionResult from './CompletionResult.vue';
import { useI18n } from 'vue-i18n';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import AppFlex from 'src/components/AppFlex.vue';
import ErrorDisplay from 'src/components/ErrorDisplay.vue';
import { DEFAULT_COMPLETION_ITEM_HEIGHT } from 'src/constants/completion-item';

defineProps<
  {
    placeholder?: string;
  } & Partial<CompletionConfig>
>();

const stopKeybindingContext = api.core.useKeybindings().pushContext(KEYBINDING_CONTEXTS.COMPLETION);
onUnmounted(stopKeybindingContext);

const { config } = storeToRefs(api.ui.useModal());
const completionStore = api.core.useCompletion();
const { activeCompletion } = storeToRefs(completionStore);

const { isLoading: isSearching } = storeToRefs(completionStore);

const completionInputRef = ref<InstanceType<typeof CompletionInput> | null>(null);
const handleResultSelect = () => completionInputRef.value?.focusInput?.();

const completionItemHeight = computed(
  () => activeCompletion.value?.itemHeight ?? DEFAULT_COMPLETION_ITEM_HEIGHT,
);

const { desktopBelow } = api.ui.useScreenDetection();
const { keyboardOpened, keyboardHeight } = api.ui.useKeyboardState();
const shouldReverse = computed(() => desktopBelow.value);

const isInputOnly = computed(() => activeCompletion.value?.type === 'input');
const hasKeyboardHeight = computed(() => keyboardHeight.value > 0);
const shouldAnchorToKeyboard = computed(
  () => desktopBelow.value && keyboardOpened.value && hasKeyboardHeight.value,
);
const isKeyboardAnchored = computed(() => isInputOnly.value && shouldAnchorToKeyboard.value);

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>

<style lang="scss" scoped>
.completion-wrapper {
  max-width: var(--completion-max-width);
  width: var(--completion-width) !important;

  &.full-screen {
    max-width: unset;
  }
}

.header-stack {
  padding: var(--padding-xs) var(--completion-padding);
  width: 100%;
}

.header {
  height: var(--completion-header-height);
  width: 100%;
}

.body {
  padding: var(--completion-padding);
}

.body {
  padding-right: calc(var(--completion-padding) - var(--scroll-bar-width));
}

.footer {
  & {
    padding: var(--padding-lg);
    height: var(--completion-footer-height);
    color: var(--fg-muted);
  }
}

@mixin completion-fullframe {
  max-width: unset;
  width: 100% !important;
  height: 100%;
}

@include desktop-below {
  .completion-wrapper {
    @include completion-fullframe();
    position: relative;

    &.input-only {
      height: auto;

      :deep(.layout-body) {
        display: none;
      }
    }

    &.input-only.keyboard-anchored {
      position: fixed;
      left: 0;
      right: 0;
      top: calc(
        var(--initial-viewport-height, 100vh) - var(--keyboard-height, 0px) - var(
            --completion-header-height
          )
      );
      z-index: 2;
      height: auto;
      max-width: unset;
      padding: 0 var(--completion-header-margin);

      :deep(.layout) {
        height: auto;
      }
    }
  }

  .completion-wrapper:not(.input-only) {
    :deep(.layout-header) {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1;
      margin: 0 var(--completion-header-margin) var(--completion-header-margin);
      border-top: none;
    }

    :deep(.layout-body) {
      padding-bottom: var(--completion-header-offset);
    }
  }

  .header {
    background: var(--completion-header-bg);
    -webkit-backdrop-filter: var(--completion-header-backdrop-filter);
    backdrop-filter: var(--completion-header-backdrop-filter);
    background-clip: padding-box;
    box-shadow: var(--completion-header-box-shadow);
    border: var(--completion-header-border);
    border-top: var(--glass-border-top);
    border-radius: var(--completion-header-border-radius);
  }
}

@include desktop {
  .completion-wrapper {
    height: auto;

    &:not(.full-screen) {
      max-height: var(--completion-max-height, 68vh);
    }
  }
}

.full-screen {
  @include completion-fullframe();
}

.not-found {
  & {
    color: var(--fg-muted);
  }
}
</style>
