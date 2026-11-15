import type { OrgNoteApi, LogLevel, LogRecord } from 'orgnote-api';
import spec, { type SpectralLoggerWeb } from 'spectrallogs/web';
import type { SpectralConfigOptionsWeb } from 'spectrallogs/web';
import createRedact from '@pinojs/redact';
import { submitLogRecord } from 'src/stores/log-dispatcher';
import { isPresent, isNullable, to } from 'orgnote-api/utils';

type Logger = OrgNoteApi['utils']['logger'];
type Bindings = Record<string, unknown>;

const spectralMethodMap: Record<LogLevel, 'error' | 'warn' | 'info' | 'debug'> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
  trace: 'debug',
};

const DEBUG_ENABLED = process.env.DEV === true || process.env.NODE_ENV !== 'production';

const SECRET_PLACEHOLDER = '***';
const EMAIL_REGEX = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;
const PHONE_REGEX = /(\+?\d[\d\s-]{7,}\d)/g;

const SENSITIVE_PATHS = [
  'password',
  'pass',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'apikey',
  'api_key',
  'email',
  'phone',
  'context.password',
  'context.pass',
  'context.pwd',
  'context.secret',
  'context.token',
  'context.apiKey',
  'context.apikey',
  'context.api_key',
  'context.email',
  'context.phone',
  'context.*.password',
  'context.*.pass',
  'context.*.pwd',
  'context.*.secret',
  'context.*.token',
  'context.*.apiKey',
  'context.*.apikey',
  'context.*.api_key',
  'context.*.email',
  'context.*.phone',
  'context.*.*.password',
  'context.*.*.secret',
  'context.*.*.token',
  'context.*.*.email',
  'context.*.*.phone',
  'bindings.password',
  'bindings.pass',
  'bindings.pwd',
  'bindings.secret',
  'bindings.token',
  'bindings.apiKey',
  'bindings.apikey',
  'bindings.api_key',
  'bindings.email',
  'bindings.phone',
  'bindings.*.password',
  'bindings.*.secret',
  'bindings.*.token',
  'bindings.*.email',
  'bindings.*.phone',
  'bindings.*.*.password',
  'bindings.*.*.secret',
  'bindings.*.*.token',
  'bindings.*.*.email',
  'bindings.*.*.phone',
];

const pathRedactor = createRedact({
  paths: SENSITIVE_PATHS,
  censor: SECRET_PLACEHOLDER,
  serialize: false,
  strict: false,
});

const maskEmail = (value: string): string =>
  value.replace(EMAIL_REGEX, (_match, local, domain) => {
    if (!local) return _match;
    const visibleStart = local.slice(0, 1);
    const masked = local.length > 1 ? '***' : '';
    return `${visibleStart}${masked}@${domain}`;
  });

const maskPhone = (value: string): string =>
  value.replace(PHONE_REGEX, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 8) return match;
    const maskedDigits = `${'*'.repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
    let index = 0;
    return match.replace(/\d/g, () => maskedDigits[index++] ?? '*');
  });

const sanitizeString = (value: string): string => maskPhone(maskEmail(value));

const cloneObject = (value: Record<string, unknown>): Record<string, unknown> => {
  const safeClone = to(() => JSON.parse(JSON.stringify(value)) as Record<string, unknown>);
  const result = safeClone();
  if (result.isOk()) return result.value;
  return { ...value };
};

const maskDeep = (value: unknown): unknown => {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map((entry) => maskDeep(entry));
  if (value instanceof Error) return errorContext(value);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      result[key] = maskDeep(entry);
    });
    return result;
  }
  return value;
};

const sanitizeObject = (value: Record<string, unknown>): Record<string, unknown> => {
  const clone = cloneObject(value);
  const redacted = pathRedactor(clone);
  const masked = maskDeep(redacted);
  const safeClone = to(() => JSON.parse(JSON.stringify(masked)) as Record<string, unknown>);
  const result = safeClone();
  if (result.isOk()) return result.value;

  if (typeof masked === 'object' && isPresent(masked)) {
    return { ...masked } as Record<string, unknown>;
  }
  return {};
};

const toMessage = (value: unknown): string => {
  if (typeof value === 'string') return sanitizeString(value);
  if (value instanceof Error) return sanitizeString(`${value.name}: ${value.message}`);
  if (value === undefined) return 'undefined';
  if (isNullable(value)) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  if (typeof value === 'symbol') return value.toString();
  if (!isPresent(value)) return '';
  const safeStringify = to(() => JSON.stringify(value));
  const result = safeStringify();
  if (result.isOk()) return sanitizeString(result.value);
  return sanitizeString(String(value));
};

const errorContext = (error: Error): Record<string, unknown> => {
  const context: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };
  if (error.stack) context.stack = error.stack;
  const hasCause = 'cause' in error && isPresent((error as { cause?: unknown }).cause);
  if (hasCause) context.cause = (error as { cause?: unknown }).cause;
  return context;
};

const extractContext = (value: unknown): Record<string, unknown> | undefined => {
  if (value instanceof Error) return errorContext(value);
  if (!isPresent(value)) return undefined;
  if (typeof value !== 'object') return undefined;
  return value as Record<string, unknown>;
};

const mergeContext = (
  segments: Array<Record<string, unknown> | undefined>,
): Record<string, unknown> | undefined => {
  const validSegments = segments.filter((segment): segment is Record<string, unknown> =>
    Boolean(segment),
  );
  if (!validSegments.length) return undefined;
  return validSegments.reduce<Record<string, unknown>>(
    (acc, segment) => ({ ...acc, ...segment }),
    {},
  );
};

const hasEntries = (record?: Record<string, unknown>): record is Record<string, unknown> =>
  Boolean(record && Object.keys(record).length > 0);

const findStackTrace = (primary: unknown, extras: unknown[]): string | undefined => {
  const candidates = [primary, ...extras];
  for (const candidate of candidates) {
    if (candidate instanceof Error && candidate.stack) return candidate.stack;
    if (candidate && typeof candidate === 'object') {
      const stack = (candidate as { stack?: unknown }).stack;
      if (typeof stack === 'string') return stack;
    }
  }
  return undefined;
};

const buildRecord = (
  level: LogLevel,
  primary: unknown,
  extras: unknown[],
  bindings: Bindings,
): LogRecord => {
  const timestamp = new Date();
  const mergedContext = mergeContext([primary, ...extras].map(extractContext));
  const stackTrace = findStackTrace(primary, extras);

  const record: LogRecord = {
    ts: timestamp,
    level,
    message: toMessage(primary),
    repeatCount: 1,
    firstTs: timestamp,
    lastTs: timestamp,
  };

  const contextWithStack = mergedContext ? { ...mergedContext } : {};
  if (stackTrace && !contextWithStack.stack) {
    contextWithStack.stack = stackTrace;
  }

  if (hasEntries(contextWithStack)) record.context = sanitizeObject(contextWithStack);
  if (hasEntries(bindings)) record.bindings = sanitizeObject(bindings);
  return record;
};

const shouldRecordLogs = (): boolean => !!process.env.CLIENT;

const shouldRecordLevel = (level: LogLevel): boolean => {
  if (!DEBUG_ENABLED && (level === 'debug' || level === 'trace')) return false;
  return true;
};

const createLoggerAdapter = (base: SpectralLoggerWeb, bindings: Bindings = {}): Logger => {
  const emit = (level: LogLevel, primary: unknown, extras: unknown[]): void => {
    const method = spectralMethodMap[level];
    const spectralMessage = toMessage(primary);
    const target = base[method] as (message: string) => void;
    const stackTrace = findStackTrace(primary, extras);
    target.call(base, spectralMessage);
    if (stackTrace && (level === 'error' || DEBUG_ENABLED)) {
      console.error(stackTrace);
    }
    if (!shouldRecordLogs() || !shouldRecordLevel(level)) return;
    const record = buildRecord(level, primary, extras, bindings);
    submitLogRecord(record);
  };

  return {
    info: (msg: unknown, ...args: unknown[]) => emit('info', msg, args),
    error: (msg: unknown, ...args: unknown[]) => emit('error', msg, args),
    warn: (msg: unknown, ...args: unknown[]) => emit('warn', msg, args),
    debug: (msg: unknown, ...args: unknown[]) => emit('debug', msg, args),
    trace: (msg: unknown, ...args: unknown[]) => emit('trace', msg, args),
    child: (extraBindings: Bindings) =>
      createLoggerAdapter(base, { ...bindings, ...extraBindings }),
  };
};

const createSpectralLogger = (): Logger => {
  spec.configure({ debugMode: DEBUG_ENABLED } as SpectralConfigOptionsWeb);
  return createLoggerAdapter(spec);
};

export { createSpectralLogger, toMessage, extractContext, mergeContext, buildRecord };
