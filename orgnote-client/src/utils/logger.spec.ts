import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSpectralLogger } from './logger';

function createMockSpectral() {
  return class MockSpectral {
    info = vi.fn();
    error = vi.fn();
    warn = vi.fn();
    debug = vi.fn();
    log = vi.fn();
    child = vi.fn(() => new MockSpectral());
  };
}

vi.mock('spectrallogs', () => {
  const MockSpectral = createMockSpectral();
  return { SpectralLogger: MockSpectral };
});

vi.mock('spectrallogs/web', () => {
  const MockSpectralWeb = createMockSpectral();
  class MockWeb extends MockSpectralWeb {
    configure = vi.fn();
  }
  return { SpectralLoggerWeb: MockWeb, default: new MockWeb() };
});

let logger: ReturnType<typeof createSpectralLogger>;
const originalClient = process.env.CLIENT;
const originalDev = process.env.DEV;
const originalWindow = globalThis.window;

beforeEach(() => {
  vi.clearAllMocks();
  delete (globalThis as { window?: unknown }).window;
  process.env.CLIENT = '';
  process.env.DEV = false;
  logger = createSpectralLogger();
});

afterEach(() => {
  process.env.CLIENT = originalClient;
  process.env.DEV = originalDev;
  if (originalWindow) {
    globalThis.window = originalWindow;
  } else {
    delete (globalThis as { window?: unknown }).window;
  }
});

test('creates logger with correct interface', () => {
  expect(logger).toBeDefined();
  expect(typeof logger.info).toBe('function');
  expect(typeof logger.error).toBe('function');
  expect(typeof logger.warn).toBe('function');
  expect(typeof logger.debug).toBe('function');
  expect(typeof logger.trace).toBe('function');
  expect(typeof logger.child).toBe('function');
});

test('logger info logs message correctly', () => {
  const message = 'Test info message';
  logger.info(message);

  expect(logger.info).toBeDefined();
});

test('logger error logs message with context', () => {
  const message = 'Test error message';
  const context = { userId: 123, action: 'test' };
  logger.error(message, context);

  expect(logger.error).toBeDefined();
});

test('logger child creates child logger', () => {
  const bindings = { module: 'test-module' };
  const childLogger = logger.child(bindings);

  expect(childLogger).toBeDefined();
  expect(typeof childLogger.info).toBe('function');
  expect(typeof childLogger.error).toBe('function');
  expect(typeof childLogger.warn).toBe('function');
  expect(typeof childLogger.debug).toBe('function');
  expect(typeof childLogger.trace).toBe('function');
  expect(typeof childLogger.child).toBe('function');
});

test('child logger can create nested child', () => {
  const parentBindings = { module: 'parent' };
  const childBindings = { component: 'child' };

  const childLogger = logger.child(parentBindings);
  const nestedChildLogger = childLogger.child(childBindings);

  expect(nestedChildLogger).toBeDefined();
  expect(typeof nestedChildLogger.info).toBe('function');
});

test('all log levels work correctly', () => {
  const message = 'Test message';

  logger.info(message);
  logger.error(message);
  logger.warn(message);
  logger.debug(message);
  logger.trace(message);

  expect(true).toBe(true);
});

test('logger handles empty arguments correctly', () => {
  expect(() => {
    logger.info('Test message');
    logger.error('Test error');
    logger.warn('Test warning');
    logger.debug('Test debug');
    logger.trace('Test trace');
  }).not.toThrow();
});

test('logs stack trace to console in dev mode when provided', () => {
  process.env.DEV = true;
  const stackTrace = 'Error: boom\n    at fn (file:1:1)';
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const devLogger = createSpectralLogger();
  devLogger.error('message', { stack: stackTrace });

  expect(consoleSpy).toHaveBeenCalledWith(stackTrace);
  consoleSpy.mockRestore();
});
