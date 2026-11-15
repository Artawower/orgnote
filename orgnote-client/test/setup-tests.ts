import { vi, beforeEach, afterEach } from 'vitest';
import { config } from '@vue/test-utils';
import { Quasar } from 'quasar';
import iconSet from 'quasar/icon-set/material-icons.js';
import { createPinia, setActivePinia } from 'pinia';

process.env.CLIENT = 'true';
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

vi.mock('src/boot/logger', () => ({
  logger: mockLogger,
}));

vi.mock('src/boot/repositories', () => ({
  repositories: {
    paneSnapshotRepository: {
      save: vi.fn(),
      getLatest: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    reportError: vi.fn(),
  },
}));

config.global.plugins = [
  [
    Quasar,
    {
      iconSet,
      plugins: {},
    },
  ],
];

if (typeof HTMLElement !== 'undefined' && !globalThis.HTMLDialogElement) {
  class HTMLDialogElementMock extends HTMLElement {
    open = false;
    showModal = vi.fn(() => {
      this.open = true;
    });
    close = vi.fn(() => {
      this.open = false;
    });
  }
  globalThis.HTMLDialogElement = HTMLDialogElementMock as unknown as typeof HTMLDialogElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.restoreAllMocks();
});
