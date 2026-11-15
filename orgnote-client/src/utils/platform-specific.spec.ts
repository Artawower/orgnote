import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  androidOnly,
  clientOnly,
  serverOnly,
  mobileOnly,
  desktopOnly,
  nativeMobileOnly,
} from './platform-specific';
import { Platform } from 'quasar';

vi.mock('quasar', () => ({
  Platform: {
    is: {
      nativeMobile: false,
      android: false,
      mobile: false,
    },
  },
}));

beforeEach(() => {
  Platform.is.nativeMobile = false;
  Platform.is.android = false;
  Platform.is.mobile = false;
});

describe('sync functions', () => {
  test('clientOnly executes sync fn when CLIENT is true', () => {
    process.env.CLIENT = 'true';
    const mockFn = vi.fn(() => 'Client only');

    const result = clientOnly(mockFn, 'default')();

    expect(mockFn).toHaveBeenCalledOnce();
    expect(result).toBe('Client only');
  });

  test('clientOnly returns default value when CLIENT is false', () => {
    process.env.CLIENT = '';
    const mockFn = vi.fn(() => 'Client only');

    const result = clientOnly(mockFn, 'default')();

    expect(mockFn).not.toHaveBeenCalled();
    expect(result).toBe('default');
  });

  test('serverOnly executes sync fn when CLIENT is false', () => {
    process.env.CLIENT = '';
    const mockFn = vi.fn(() => 'Server only');

    const result = serverOnly(mockFn, 'default')();

    expect(mockFn).toHaveBeenCalledOnce();
    expect(result).toBe('Server only');
  });

  test('serverOnly returns default value when CLIENT is true', () => {
    process.env.CLIENT = 'true';
    const mockFn = vi.fn(() => 'Server only');

    const result = serverOnly(mockFn, 'default')();

    expect(mockFn).not.toHaveBeenCalled();
    expect(result).toBe('default');
  });
});

describe('async functions', () => {
  test('clientOnly executes async fn and returns Promise when CLIENT is true', async () => {
    process.env.CLIENT = 'true';
    const mockFn = vi.fn(async () => 'Async client');

    const result = await clientOnly(mockFn, 'default')();

    expect(mockFn).toHaveBeenCalledOnce();
    expect(result).toBe('Async client');
  });

  test('clientOnly returns Promise with default for async fn when CLIENT is false', async () => {
    process.env.CLIENT = '';
    const mockFn = vi.fn(async () => 'Async client');

    const result = await clientOnly(mockFn, 'default')();

    expect(mockFn).not.toHaveBeenCalled();
    expect(result).toBe('default');
  });
});

describe('platform-specific wrappers', () => {
  test('androidOnly executes fn only on Android platform', () => {
    process.env.CLIENT = 'true';
    Platform.is.nativeMobile = true;
    Platform.is.android = true;
    const mockFn = vi.fn(() => 'Android only');

    const result = androidOnly(mockFn, 'default')();

    expect(mockFn).toHaveBeenCalledOnce();
    expect(result).toBe('Android only');
  });

  test('androidOnly returns default value on non-Android platform', () => {
    process.env.CLIENT = 'true';
    const mockFn = vi.fn(() => 'Android only');

    const result = androidOnly(mockFn, 'default')();

    expect(mockFn).not.toHaveBeenCalled();
    expect(result).toBe('default');
  });

  test('mobileOnly executes fn only on mobile platform', () => {
    process.env.CLIENT = 'true';
    Platform.is.mobile = true;
    const mockFn = vi.fn(() => 'Mobile only');

    const result = mobileOnly(mockFn, 'default')();

    expect(mockFn).toHaveBeenCalledOnce();
    expect(result).toBe('Mobile only');
  });

  test('mobileOnly returns default value on non-mobile platform', () => {
    process.env.CLIENT = 'true';
    const mockFn = vi.fn(() => 'Mobile only');

    const result = mobileOnly(mockFn, 'default')();

    expect(mockFn).not.toHaveBeenCalled();
    expect(result).toBe('default');
  });

  test('nativeMobileOnly executes fn only on native mobile platform', () => {
    process.env.CLIENT = 'true';
    Platform.is.nativeMobile = true;
    const mockFn = vi.fn(() => 'Native mobile only');

    const result = nativeMobileOnly(mockFn, 'default')();

    expect(mockFn).toHaveBeenCalledOnce();
    expect(result).toBe('Native mobile only');
  });

  test('desktopOnly executes fn only on desktop platform', () => {
    process.env.CLIENT = 'true';
    const mockFn = vi.fn(() => 'Desktop only');

    const result = desktopOnly(mockFn, 'default')();

    expect(mockFn).toHaveBeenCalledOnce();
    expect(result).toBe('Desktop only');
  });

  test('desktopOnly returns default value on mobile platform', () => {
    process.env.CLIENT = 'true';
    Platform.is.mobile = true;
    const mockFn = vi.fn(() => 'Desktop only');

    const result = desktopOnly(mockFn, 'default')();

    expect(mockFn).not.toHaveBeenCalled();
    expect(result).toBe('default');
  });
});
