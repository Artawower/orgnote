import { expect, test, vi, beforeEach, afterEach } from 'vitest';

vi.mock('quasar', () => ({
  Platform: {
    is: {
      mobile: false,
      desktop: true,
      nativeMobile: false,
      electron: false,
    },
  },
}));

beforeEach(() => {
  vi.stubGlobal('process', { env: { CLIENT: true } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('platformMatch returns desktop handler when on desktop', async () => {
  const { platformMatch } = await import('./platform-detection');

  const result = await platformMatch({
    desktop: () => 'desktop-result',
    mobile: () => 'mobile-result',
    default: () => 'default-result',
  });

  expect(result).toBe('desktop-result');
});

test('platformMatch returns default when no specific handler matches', async () => {
  const { platformMatch } = await import('./platform-detection');

  const result = await platformMatch({
    nativeMobile: () => 'mobile-result',
    default: () => 'default-result',
  });

  expect(result).toBe('default-result');
});

test('platform.is returns correct platform flags', async () => {
  const { platform } = await import('./platform-detection');

  expect(platform.is.desktop).toBe(true);
  expect(platform.is.nativeMobile).toBe(false);
});

test('platform.current returns active platforms', async () => {
  const { platform } = await import('./platform-detection');

  expect(platform.current).toContain('desktop');
  expect(platform.current).not.toContain('nativeMobile');
});

test('platformMatch supports async handlers', async () => {
  const { platformMatch } = await import('./platform-detection');

  const result = await platformMatch({
    desktop: async () => {
      await Promise.resolve();
      return 'async-desktop';
    },
    default: () => 'default',
  });

  expect(result).toBe('async-desktop');
});
