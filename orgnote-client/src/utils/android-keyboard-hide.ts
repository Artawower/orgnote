const hideWindowDurationMs = 500;

let hideWindowTimer: ReturnType<typeof setTimeout> | undefined;
let hideWindowActive = false;

export const isKeyboardHideWindowActive = (): boolean => hideWindowActive;

export const startKeyboardHideWindow = (onExpire?: () => void): (() => void) => {
  if (hideWindowTimer !== undefined) {
    clearTimeout(hideWindowTimer);
  }
  hideWindowActive = true;

  const end = (): void => {
    if (hideWindowTimer !== undefined) {
      clearTimeout(hideWindowTimer);
      hideWindowTimer = undefined;
    }
    hideWindowActive = false;
    onExpire?.();
  };

  hideWindowTimer = setTimeout(end, hideWindowDurationMs);

  return end;
};
