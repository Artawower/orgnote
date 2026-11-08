import type { Directive } from 'vue';

const holdDelayMs = 300;
const moveThresholdPx = 10;
const clickSuppressionMaxDelayMs = 120;
const clickSuppressionMaxDistancePx = 16;
const runtimeKey = Symbol('contextHold');

type HoldHandler = () => void;

type ContextHoldBinding = {
  enabled: boolean;
  onHold: HoldHandler;
};

type ContextHoldState = {
  enabled: boolean;
  onHold: HoldHandler;
  originX: number;
  originY: number;
  pointerId: number | null;
  timer: ReturnType<typeof setTimeout> | null;
  triggered: boolean;
  shouldSuppressClick: boolean;
  releaseX: number;
  releaseY: number;
  releasedAt: number;
  hasDocumentListeners: boolean;
  hasClickListener: boolean;
};

type ContextHoldRuntime = {
  state: ContextHoldState;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onClickCapture: (event: MouseEvent) => void;
};

type ContextHoldElement = HTMLElement & {
  [runtimeKey]?: ContextHoldRuntime;
};

const noop = () => undefined;

const readBinding = (value: unknown): ContextHoldBinding => {
  if (!value || typeof value !== 'object') {
    return {
      enabled: false,
      onHold: noop,
    };
  }

  const binding = value as Partial<ContextHoldBinding>;
  return {
    enabled: binding.enabled === true,
    onHold: typeof binding.onHold === 'function' ? binding.onHold : noop,
  };
};

const stopEvent = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const resetPressState = (state: ContextHoldState) => {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }

  state.originX = 0;
  state.originY = 0;
  state.pointerId = null;
  state.triggered = false;
};

const resetClickSuppression = (state: ContextHoldState) => {
  state.shouldSuppressClick = false;
  state.releaseX = 0;
  state.releaseY = 0;
  state.releasedAt = 0;
};

const removeDocumentListeners = (runtime: ContextHoldRuntime) => {
  const { state, onPointerMove, onPointerUp, onPointerCancel } = runtime;
  if (!state.hasDocumentListeners || typeof document === 'undefined') {
    return;
  }

  document.removeEventListener('pointermove', onPointerMove, true);
  document.removeEventListener('pointerup', onPointerUp, true);
  document.removeEventListener('pointercancel', onPointerCancel, true);
  state.hasDocumentListeners = false;
};

const addDocumentListeners = (runtime: ContextHoldRuntime) => {
  const { state, onPointerMove, onPointerUp, onPointerCancel } = runtime;
  if (state.hasDocumentListeners || typeof document === 'undefined') {
    return;
  }

  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerCancel, true);
  state.hasDocumentListeners = true;
};

const removeClickListener = (runtime: ContextHoldRuntime) => {
  const { state, onClickCapture } = runtime;
  if (!state.hasClickListener || typeof document === 'undefined') {
    return;
  }

  document.removeEventListener('click', onClickCapture, true);
  state.hasClickListener = false;
};

const addClickListener = (runtime: ContextHoldRuntime) => {
  const { state, onClickCapture } = runtime;
  if (state.hasClickListener || typeof document === 'undefined') {
    return;
  }

  document.addEventListener('click', onClickCapture, true);
  state.hasClickListener = true;
};

export const vContextHold: Directive<ContextHoldElement, ContextHoldBinding> = {
  mounted: (el, binding) => {
    const initialBinding = readBinding(binding.value);
    const state: ContextHoldState = {
      enabled: initialBinding.enabled,
      onHold: initialBinding.onHold,
      originX: 0,
      originY: 0,
      pointerId: null,
      timer: null,
      triggered: false,
      shouldSuppressClick: false,
      releaseX: 0,
      releaseY: 0,
      releasedAt: 0,
      hasDocumentListeners: false,
      hasClickListener: false,
    };

    const runtime: ContextHoldRuntime = {
      state,
      onPointerDown: (event) => {
        if (!state.enabled || event.pointerType === 'mouse' || event.button !== 0) {
          return;
        }

        resetClickSuppression(state);
        removeClickListener(runtime);
        resetPressState(state);
        addDocumentListeners(runtime);
        state.originX = event.clientX;
        state.originY = event.clientY;
        state.pointerId = event.pointerId;
        state.timer = setTimeout(() => {
          state.timer = null;
          state.triggered = true;
          state.onHold();
        }, holdDelayMs);
      },
      onPointerMove: (event) => {
        if (event.pointerId !== state.pointerId || !state.timer) {
          return;
        }

        const dx = event.clientX - state.originX;
        const dy = event.clientY - state.originY;
        const distance = Math.hypot(dx, dy);
        if (distance < moveThresholdPx) {
          return;
        }

        resetPressState(state);
        removeDocumentListeners(runtime);
      },
      onPointerUp: (event) => {
        handlePointerEnd(runtime, event);
      },
      onPointerCancel: (event) => {
        handlePointerEnd(runtime, event);
      },
      onClickCapture: (event) => {
        if (!state.shouldSuppressClick) {
          removeClickListener(runtime);
          return;
        }

        const elapsedMs = Date.now() - state.releasedAt;
        const dx = event.clientX - state.releaseX;
        const dy = event.clientY - state.releaseY;
        const distance = Math.hypot(dx, dy);
        const shouldSuppressSameGesture =
          elapsedMs <= clickSuppressionMaxDelayMs && distance <= clickSuppressionMaxDistancePx;

        if (!shouldSuppressSameGesture) {
          resetClickSuppression(state);
          removeClickListener(runtime);
          return;
        }

        resetClickSuppression(state);
        removeClickListener(runtime);
        stopEvent(event);
      },
    };

    el[runtimeKey] = runtime;
    el.addEventListener('pointerdown', runtime.onPointerDown, true);
  },
  updated: (el, binding) => {
    const runtime = el[runtimeKey];
    if (!runtime) {
      return;
    }

    const nextBinding = readBinding(binding.value);
    runtime.state.enabled = nextBinding.enabled;
    runtime.state.onHold = nextBinding.onHold;
  },
  unmounted: (el) => {
    const runtime = el[runtimeKey];
    if (!runtime) {
      return;
    }

    resetPressState(runtime.state);
    removeDocumentListeners(runtime);
    removeClickListener(runtime);
    el.removeEventListener('pointerdown', runtime.onPointerDown, true);
    delete el[runtimeKey];
  },
};

const handlePointerEnd = (runtime: ContextHoldRuntime, event: PointerEvent) => {
  const { state } = runtime;
  if (event.pointerId !== state.pointerId) {
    return;
  }

  const wasTriggered = state.triggered;
  resetPressState(state);
  removeDocumentListeners(runtime);

  if (!wasTriggered) {
    return;
  }

  state.shouldSuppressClick = true;
  state.releaseX = event.clientX;
  state.releaseY = event.clientY;
  state.releasedAt = Date.now();
  addClickListener(runtime);
  stopEvent(event);
};
