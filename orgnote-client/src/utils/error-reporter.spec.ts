import { test, expect, vi, beforeEach } from 'vitest';
import { createErrorReporter } from './error-reporter';
import type { ErrorReporterNotifications } from './error-reporter';
import type { OrgNoteApi } from 'orgnote-api';

type StoreDef = ReturnType<OrgNoteApi['core']['useNotifications']>;
type NotificationConfig = Parameters<StoreDef['notify']>[0];

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(),
};

const mockNotifications: ErrorReporterNotifications = {
  notify: vi.fn<(config: NotificationConfig) => string>().mockReturnValue('test-id'),
};

const mockExecuteCommand = vi.fn();

let errorReporter: ReturnType<typeof createErrorReporter>;

beforeEach(() => {
  vi.clearAllMocks();
  errorReporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);
});

test('createErrorReporter returns proper interface', () => {
  expect(errorReporter).toBeDefined();
  expect(typeof errorReporter.report).toBe('function');
  expect(typeof errorReporter.reportResult).toBe('function');
  expect(typeof errorReporter.reportError).toBe('function');
  expect(typeof errorReporter.reportWarning).toBe('function');
  expect(typeof errorReporter.reportInfo).toBe('function');
});

test('report logs error and shows notification', () => {
  const error = new Error('Test error message');

  errorReporter.report(error);

  expect(mockLogger.error).toHaveBeenCalledWith('Test error message', {
    name: 'Error',
    message: 'Test error message',
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Test error message',
    level: 'danger',
    onClick: expect.any(Function),
  });
});

test('report handles options.level', () => {
  const error = new Error('Test warning');

  errorReporter.report(error, { level: 'warn' });

  expect(mockLogger.warn).toHaveBeenCalledWith('Test warning', {
    name: 'Error',
    message: 'Test warning',
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Test warning',
    level: 'warning',
    onClick: expect.any(Function),
  });
});

test('report handles error with cause', () => {
  const originalError = new Error('Original error');
  const error = new Error('User friendly message', { cause: originalError });

  errorReporter.report(error);

  expect(mockLogger.error).toHaveBeenCalledWith('User friendly message', {
    name: 'Error',
    message: 'User friendly message',
    cause: {
      name: 'Error',
      message: originalError.message,
      stack: originalError.stack,
      cause: undefined,
    },
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'User friendly message',
    level: 'danger',
    onClick: expect.any(Function),
  });
});

test('reportResult works with neverthrow-like Result', () => {
  const resultError = { error: 'File not found' };
  const message = 'Failed to read file';

  errorReporter.reportResult(resultError, message);

  expect(mockLogger.error).toHaveBeenCalledWith(message, {
    cause: 'File not found',
    stack: expect.any(String),
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message,
    level: 'danger',
    onClick: expect.any(Function),
  });
});

test('reportResult handles options.level', () => {
  const resultError = { error: 'Warning condition' };
  const message = 'Warning';

  errorReporter.reportResult(resultError, message, { level: 'warn' });

  expect(mockLogger.warn).toHaveBeenCalledWith(message, {
    cause: 'Warning condition',
    stack: expect.any(String),
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message,
    level: 'warning',
    onClick: expect.any(Function),
  });
});

test('reportError is shortcut for error level', () => {
  const error = new Error('Error message');

  errorReporter.reportError(error);

  expect(mockLogger.error).toHaveBeenCalledWith('Error message', {
    name: 'Error',
    message: 'Error message',
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Error message',
    level: 'danger',
    onClick: expect.any(Function),
  });
});

test('reportWarning is shortcut for warn level', () => {
  const error = new Error('Warning message');

  errorReporter.reportWarning(error);

  expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', {
    name: 'Error',
    message: 'Warning message',
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Warning message',
    level: 'warning',
    onClick: expect.any(Function),
  });
});

test('reportInfo is shortcut for info level', () => {
  const error = new Error('Info message');

  errorReporter.reportInfo(error);

  expect(mockLogger.info).toHaveBeenCalledWith('Info message', {
    name: 'Error',
    message: 'Info message',
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Info message',
    level: 'info',
    onClick: expect.any(Function),
  });
});

test('report accepts unknown: string', () => {
  errorReporter.report('String error');
  expect(mockLogger.error).toHaveBeenCalledWith('String error', { message: 'String error' });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'String error', level: 'danger', onClick: expect.any(Function) });
});

test('report accepts unknown: object with message', () => {
  const obj = { message: 'Boom', code: 123 } as const;
  errorReporter.report(obj);
  expect(mockLogger.error).toHaveBeenCalledWith('Boom', { message: 'Boom' });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Boom', level: 'danger', onClick: expect.any(Function) });
});

test('report accepts unknown: primitive without message', () => {
  errorReporter.report(404);
  expect(mockLogger.error).toHaveBeenCalledWith('404', { rawValue: '404' });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: '404', level: 'danger', onClick: expect.any(Function) });
});

test('reportWarning works with unknown', () => {
  errorReporter.reportWarning('Warn str');
  expect(mockLogger.warn).toHaveBeenCalledWith('Warn str', { message: 'Warn str' });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Warn str', level: 'warning', onClick: expect.any(Function) });
});

test('reportInfo works with unknown', () => {
  errorReporter.reportInfo('Info str');
  expect(mockLogger.info).toHaveBeenCalledWith('Info str', { message: 'Info str' });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Info str', level: 'info', onClick: expect.any(Function) });
});

test('report uses provided notification message and level', () => {
  const err = new Error('Original');
  errorReporter.report(err, { notification: { message: 'Custom', level: 'info' } as NotificationConfig });
  expect(mockLogger.error).toHaveBeenCalledWith('Original', { name: 'Error', message: 'Original', cause: err.cause, stack: err.stack });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Custom', level: 'info', onClick: expect.any(Function) });
});

test('report fills missing notification fields and respects options.level', () => {
  const err = new Error('Warn original');
  errorReporter.report(err, { level: 'warn', notification: { description: 'Desc' } as NotificationConfig });
  expect(mockLogger.warn).toHaveBeenCalledWith('Warn original', { name: 'Error', message: 'Warn original', cause: err.cause, stack: err.stack });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Warn original', level: 'warning', description: 'Desc', onClick: expect.any(Function) });
});

test('reportError accepts NotificationConfig sugar', () => {
  const err = new Error('Sugar');
  errorReporter.reportError(err, { message: 'Shown', level: 'danger' } as NotificationConfig);
  expect(mockLogger.error).toHaveBeenCalledWith('Sugar', { name: 'Error', message: 'Sugar', cause: err.cause, stack: err.stack });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Shown', level: 'danger', onClick: expect.any(Function) });
});

test('reportResult accepts notification override', () => {
  const resultError = { error: 'reason' };
  const message = 'Failed';
  errorReporter.reportResult(resultError, message, { notification: { message: 'Shown', level: 'info' } as NotificationConfig });
  expect(mockLogger.error).toHaveBeenCalledWith('Failed', { cause: 'reason', stack: expect.any(String) });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Shown', level: 'info', onClick: expect.any(Function) });
});

test('report includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);
  const error = new Error('Click test');

  reporterWithCommand.report(error);

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Click test',
      level: 'danger',
      onClick: expect.any(Function),
    }),
  );
});

test('report onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);
  const error = new Error('Click test');

  reporterWithCommand.report(error);

  const notifyCall = (mockNotifications.notify as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { onClick?: () => void };
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportResult includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportResult({ error: 'test error' }, 'Result error');

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Result error',
      level: 'danger',
      onClick: expect.any(Function),
    }),
  );
});

test('reportResult onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportResult({ error: 'test error' }, 'Result error');

  const notifyCall = (mockNotifications.notify as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { onClick?: () => void };
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportError includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportError(new Error('Error test'));

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Error test',
      level: 'danger',
      onClick: expect.any(Function),
    }),
  );
});

test('reportError onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportError(new Error('Error test'));

  const notifyCall = (mockNotifications.notify as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { onClick?: () => void };
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportWarning includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportWarning(new Error('Warning test'));

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Warning test',
      level: 'warning',
      onClick: expect.any(Function),
    }),
  );
});

test('reportWarning onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportWarning(new Error('Warning test'));

  const notifyCall = (mockNotifications.notify as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { onClick?: () => void };
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportInfo includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportInfo(new Error('Info test'));

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Info test',
      level: 'info',
      onClick: expect.any(Function),
    }),
  );
});

test('reportInfo onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportInfo(new Error('Info test'));

  const notifyCall = (mockNotifications.notify as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { onClick?: () => void };
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportCritical includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportCritical(new Error('Critical test'));

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Critical error: Critical test',
      level: 'danger',
      timeout: 0,
      onClick: expect.any(Function),
    }),
  );
});

test('reportCritical onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportCritical(new Error('Critical test'));

  const notifyCall = (mockNotifications.notify as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { onClick?: () => void };
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('report extracts message from Axios-like error', () => {
  const axiosError = {
    message: 'Request failed',
    response: {
      data: {
        message: 'Validation failed',
      },
    },
  };

  errorReporter.report(axiosError);

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Request failed<br />Validation failed',
      level: 'danger',
    }),
  );
});

test('reportCritical handles Error object', () => {
  const error = new Error('Critical failure');

  errorReporter.reportCritical(error);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: Critical failure',
    expect.objectContaining({
      name: 'Error',
      message: 'Critical failure',
      stack: expect.any(String),
    }),
  );
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Critical error: Critical failure',
    level: 'danger',
    timeout: 0,
    onClick: expect.any(Function),
  });
});

test('reportCritical handles undefined error', () => {
  errorReporter.reportCritical(undefined);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: undefined',
    expect.objectContaining({
      rawValue: 'undefined',
      rawError: 'undefined',
    }),
  );
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Critical error: undefined',
    level: 'danger',
    timeout: 0,
    onClick: expect.any(Function),
  });
});

test('reportCritical handles null error', () => {
  errorReporter.reportCritical(null);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: null',
    expect.objectContaining({
      rawValue: 'null',
      rawError: 'null',
    }),
  );
});

test('reportCritical handles string error', () => {
  errorReporter.reportCritical('Something went wrong');

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: Something went wrong',
    expect.objectContaining({
      message: 'Something went wrong',
      rawError: 'Something went wrong',
    }),
  );
});

test('reportCritical includes meta in context', () => {
  const error = new Error('Crash');
  const meta = { component: 'MyComponent', line: 42 };

  errorReporter.reportCritical(error, meta);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: Crash',
    expect.objectContaining({
      component: 'MyComponent',
      line: 42,
      name: 'Error',
      message: 'Crash',
    }),
  );
});

test('reportCritical extracts stack from meta when error has no stack', () => {
  const meta = { stack: 'Error\n    at someFunction (file.js:10:5)' };

  errorReporter.reportCritical('Plain error', meta);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: Plain error',
    expect.objectContaining({
      stack: 'Error\n    at someFunction (file.js:10:5)',
    }),
  );
});

test('reportCritical falls back to meta stack for Error without stack', () => {
  const error = new Error('Crash');
  error.stack = undefined;
  const meta = { stack: 'Error\n    at fallback (file.js:1:1)' };

  errorReporter.reportCritical(error, meta);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: Crash',
    expect.objectContaining({
      stack: meta.stack,
    }),
  );
});

test('reportCritical handles object with message property', () => {
  const errorLike = { message: 'Custom error message', code: 500 };

  errorReporter.reportCritical(errorLike);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: Custom error message',
    expect.objectContaining({
      message: 'Custom error message',
    }),
  );
});

test('reportCritical handles object with name property', () => {
  const errorLike = { name: 'CustomError' };

  errorReporter.reportCritical(errorLike);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: CustomError',
    expect.objectContaining({
      name: 'CustomError',
    }),
  );
});

test('reportCritical handles object with stack property', () => {
  const errorLike = {
    message: 'Fake error',
    stack: 'FakeError: Fake error\n    at test (test.js:1:1)',
  };

  errorReporter.reportCritical(errorLike);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: Fake error',
    expect.objectContaining({
      stack: 'FakeError: Fake error\n    at test (test.js:1:1)',
    }),
  );
});

test('reportCritical handles Error with cause', () => {
  const cause = new Error('Root cause');
  const error = new Error('Wrapper', { cause });

  errorReporter.reportCritical(error);

  expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: Wrapper',
    expect.objectContaining({
      cause: expect.objectContaining({
        name: 'Error',
        message: 'Root cause',
        stack: expect.any(String),
      }),
    }),
  );
});

test('report handles object without message/name as details', () => {
  const obj = { foo: 'bar', baz: 123 };

  errorReporter.report(obj);

  expect(mockLogger.error).toHaveBeenCalledWith(
    '[object Object]',
    expect.objectContaining({
      details: { foo: 'bar', baz: 123 },
    }),
  );
});

test('report extracts context from object with error-like properties', () => {
  const errorLike = {
    name: 'ValidationError',
    message: 'Invalid input',
    stack: 'ValidationError: Invalid input\n    at validate (validator.js:10:5)',
  };

  errorReporter.report(errorLike);

  expect(mockLogger.error).toHaveBeenCalledWith('Invalid input', {
    name: 'ValidationError',
    message: 'Invalid input',
    stack: 'ValidationError: Invalid input\n    at validate (validator.js:10:5)',
  });
});

test('pickMessage returns fallback for empty string', () => {
  errorReporter.report('');

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Unknown error',
    }),
  );
});

test('pickMessage handles Error with empty message but has name', () => {
  const error = new Error('');
  error.name = 'EmptyError';

  errorReporter.report(error);

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'EmptyError',
    }),
  );
});

test('reportCritical uses meta.stack when Error has undefined stack', () => {
  const error = new Error('No stack error');
  Object.defineProperty(error, 'stack', { value: undefined });
  const meta = { stack: 'Error\n    at fallbackLocation (fallback.js:1:1)' };

  errorReporter.reportCritical(error, meta);

   expect(mockLogger.error).toHaveBeenCalledWith(
    'FATAL: No stack error',
    expect.objectContaining({
      stack: 'Error\n    at fallbackLocation (fallback.js:1:1)',
    }),
  );
});

test('reportWarning suppresses notification when minLevel is error', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'error');
  reporter.reportWarning(new Error('Suppressed warning'));

  expect(mockLogger.warn).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).not.toHaveBeenCalled();
});

test('reportInfo suppresses notification when minLevel is warn', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'warn');
  reporter.reportInfo(new Error('Suppressed info'));

  expect(mockLogger.info).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).not.toHaveBeenCalled();
});

test('reportError shows notification when minLevel is error', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'error');
  reporter.reportError(new Error('Visible error'));

  expect(mockLogger.error).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).toHaveBeenCalledOnce();
});

test('reportWarning shows notification when minLevel is warn', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'warn');
  reporter.reportWarning(new Error('Visible warning'));

  expect(mockLogger.warn).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).toHaveBeenCalledOnce();
});

test('reportCritical always shows notification regardless of minLevel', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'error');
  reporter.reportCritical(new Error('Always visible'));

  expect(mockLogger.error).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).toHaveBeenCalledOnce();
});

test('report suppresses notification when options.level is below minLevel', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'error');
  reporter.report(new Error('Downgraded'), { level: 'warn' });

  expect(mockLogger.warn).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).not.toHaveBeenCalled();
});

test('reportResult suppresses notification when minLevel is error and level is warn', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'error');
  reporter.reportResult({ error: 'reason' }, 'Failed', { level: 'warn' });

  expect(mockLogger.warn).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).not.toHaveBeenCalled();
});

test('reportResult shows notification when level meets minLevel', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'warn');
  reporter.reportResult({ error: 'reason' }, 'Failed');

  expect(mockLogger.error).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).toHaveBeenCalledOnce();
});

test('report suppresses notification when options.level is debug and minLevel is info', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'info');
  reporter.report(new Error('Debug msg'), { level: 'debug' });

  expect(mockLogger.debug).toHaveBeenCalledOnce();
  expect(mockNotifications.notify).not.toHaveBeenCalled();
});

test('all notifications show when minLevel is trace', () => {
  const reporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand, () => 'trace');

  reporter.reportError(new Error('e'));
  reporter.reportWarning(new Error('w'));
  reporter.reportInfo(new Error('i'));

  expect(mockNotifications.notify).toHaveBeenCalledTimes(3);
});
