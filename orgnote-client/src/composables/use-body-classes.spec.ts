import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import { useBodyClasses } from './use-body-classes';

const mockPlatform = {
  is: {
    mac: false,
  },
};

vi.mock('quasar', () => ({
  Platform: {
    is: {
      mac: false,
    },
  },
}));

beforeEach(() => {
  document.body.className = '';
  process.env.CLIENT = 'true';
  mockPlatform.is.mac = false;
});

afterEach(() => {
  vi.resetModules();
});

test('useBodyClasses adds standalone class when navigator.standalone is true', async () => {
  Object.defineProperty(window.navigator, 'standalone', {
    value: true,
    configurable: true,
  });

  useBodyClasses();

  expect(document.body.classList.contains('standalone')).toBe(true);

  Object.defineProperty(window.navigator, 'standalone', {
    value: undefined,
    configurable: true,
  });
});

test('useBodyClasses does not add standalone class when navigator.standalone is false', () => {
  Object.defineProperty(window.navigator, 'standalone', {
    value: false,
    configurable: true,
  });

  useBodyClasses();

  expect(document.body.classList.contains('standalone')).toBe(false);
});

test('useBodyClasses does not add standalone class on server', () => {
  process.env.CLIENT = '';
  Object.defineProperty(window.navigator, 'standalone', {
    value: true,
    configurable: true,
  });

  useBodyClasses();

  expect(document.body.classList.contains('standalone')).toBe(false);
});

test('useBodyClasses adds platform-mac class on macOS', async () => {
  vi.doMock('quasar', () => ({
    Platform: {
      is: {
        mac: true,
      },
    },
  }));

  const { useBodyClasses: useBodyClassesMac } = await import('./use-body-classes');
  useBodyClassesMac();

  expect(document.body.classList.contains('platform-mac')).toBe(true);
});

test('useBodyClasses does not add platform-mac class on non-macOS', () => {
  useBodyClasses();

  expect(document.body.classList.contains('platform-mac')).toBe(false);
});

test('useBodyClasses handles undefined Platform.is during SSR', async () => {
  vi.doMock('quasar', () => ({
    Platform: {
      is: undefined,
    },
  }));

  const { useBodyClasses: useBodyClassesSSR } = await import('./use-body-classes');

  expect(() => useBodyClassesSSR()).not.toThrow();
  expect(document.body.classList.contains('platform-mac')).toBe(false);
});

test('useBodyClasses handles null Platform.is during SSR', async () => {
  vi.doMock('quasar', () => ({
    Platform: {
      is: null,
    },
  }));

  const { useBodyClasses: useBodyClassesSSR } = await import('./use-body-classes');

  expect(() => useBodyClassesSSR()).not.toThrow();
  expect(document.body.classList.contains('platform-mac')).toBe(false);
});

test('useBodyClasses handles empty Platform object during SSR', async () => {
  vi.doMock('quasar', () => ({
    Platform: {},
  }));

  const { useBodyClasses: useBodyClassesSSR } = await import('./use-body-classes');

  expect(() => useBodyClassesSSR()).not.toThrow();
  expect(document.body.classList.contains('platform-mac')).toBe(false);
});
