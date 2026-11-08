type Timer = NodeJS.Timeout | number;

interface DebounceOptions {
  leading?: boolean;
}

interface DebouncedFunction<F extends (...args: Parameters<F>) => ReturnType<F>> {
  (...args: Parameters<F>): void;
  cancel: () => void;
}

export function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  waitFor: number | (() => number) = 100,
  options?: DebounceOptions,
): DebouncedFunction<F> {
  let timeout: Timer;
  let isLeadingInvoked = false;

  const debouncedFunction = (...args: Parameters<F>): void => {
    const delay = typeof waitFor === 'function' ? waitFor() : waitFor;

    if (options?.leading && !isLeadingInvoked) {
      isLeadingInvoked = true;
      func(...args);
      timeout = setTimeout(() => {
        isLeadingInvoked = false;
      }, delay);
      return;
    }

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      isLeadingInvoked = false;
      func(...args);
    }, delay);
  };

  debouncedFunction.cancel = () => {
    clearTimeout(timeout);
    isLeadingInvoked = false;
  };

  return debouncedFunction;
}
