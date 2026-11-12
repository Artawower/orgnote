import { reporter } from 'src/boot/report';
import { nativeMobileOnly } from 'src/utils/platform-specific';
import { debounce } from 'src/utils/debounce';
import { to } from 'orgnote-api/utils';

const resumeDebounceMs = 300;

type ResumeHandler = () => void | Promise<void>;
type StopHandle = () => void;

interface UseAppResumeDeps {
  setupWebResumeListener: (onResume: () => void) => StopHandle;
  setupNativeResumeListener: (onResume: () => void) => Promise<StopHandle | undefined>;
  onError: (error: unknown) => void;
}

const runSafely = async (
  onResume: ResumeHandler,
  onError: (error: unknown) => void,
): Promise<void> => {
  const runResult = to(
    () => onResume(),
    (error) => (error instanceof Error ? error : new Error('Failed to handle app resume')),
  )();

  runResult.match(
    () => undefined,
    (error) => {
      onError(error);
      return undefined;
    },
  );
};

const createWebResumeListener = (onResume: () => void): StopHandle => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined;
  }

  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      onResume();
    }
  };

  window.addEventListener('pageshow', onResume);
  window.addEventListener('online', onResume);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    window.removeEventListener('pageshow', onResume);
    window.removeEventListener('online', onResume);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
};

const createNativeResumeListener = async (
  onResume: () => void,
): Promise<StopHandle | undefined> => {
  const registerNativeListener = nativeMobileOnly(async () => {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        return;
      }

      onResume();
    });

    return () => {
      void listener.remove();
    };
  });

  return registerNativeListener();
};

const createDefaultDeps = (): UseAppResumeDeps => ({
  setupWebResumeListener: createWebResumeListener,
  setupNativeResumeListener: createNativeResumeListener,
  onError: reporter.reportWarning,
});

export const useAppResume = (onResume: ResumeHandler, deps?: UseAppResumeDeps): StopHandle => {
  const { setupWebResumeListener, setupNativeResumeListener, onError } =
    deps ?? createDefaultDeps();

  const debouncedResume = debounce(
    (): void => {
      void runSafely(onResume, onError);
    },
    resumeDebounceMs,
    { leading: true },
  );

  const stopWebListener = setupWebResumeListener(debouncedResume);

  let stopped = false;
  let stopNativeListener: StopHandle | undefined;

  const nativeSetup = setupNativeResumeListener(debouncedResume)
    .then((stopHandle) => {
      if (stopped) {
        stopHandle?.();
        return;
      }

      stopNativeListener = stopHandle;
    })
    .catch(onError);

  return () => {
    stopped = true;
    debouncedResume.cancel();
    stopWebListener();
    stopNativeListener?.();
    void nativeSetup;
  };
};

export type { ResumeHandler, StopHandle, UseAppResumeDeps };
