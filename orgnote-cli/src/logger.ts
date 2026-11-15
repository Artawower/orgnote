import { OrgNotePublishedConfig } from 'config';
import { dirname } from 'path';
import { resolveHome } from './tools/with-home-dir.js';
import { SpectralLogger, FileLoggerPlugin } from 'spectrallogs';
import type { Logger } from 'orgnote-api';
import { format } from 'util';
import createRedact from '@pinojs/redact';
import { to } from 'orgnote-api/utils';

const SECRET_PLACEHOLDER = '***';
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
  'Authorization',
  'authorization',
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
];

const pathRedactor = createRedact({
  paths: SENSITIVE_PATHS,
  censor: SECRET_PLACEHOLDER,
  serialize: false,
  strict: false,
});

const removeRestore = (obj: unknown): unknown => {
  if (obj && typeof obj === 'object' && 'restore' in obj) {
    delete (obj as Record<string, unknown>).restore;
  }
  return obj;
};

const sanitizeArg = (arg: unknown): unknown => {
  if (arg instanceof Error) {
    const errorObj: Record<string, unknown> = {
      message: arg.message,
      name: arg.name,
      stack: arg.stack,
    };
    Object.getOwnPropertyNames(arg).forEach((key) => {
      if (!(key in errorObj)) {
        errorObj[key] = (arg as unknown as Record<string, unknown>)[key];
      }
    });
    return removeRestore(pathRedactor(errorObj));
  }
  
  if (arg && typeof arg === 'object') {
    const result = to(() => {
      const clone = JSON.parse(JSON.stringify(arg));
      return removeRestore(pathRedactor(clone));
    })();
    return result.unwrapOr(arg);
  }
  return arg;
};

const formatSanitized = (msg: string, ...args: unknown[]) => {
  const sanitizedArgs = args.map(sanitizeArg);
  return format(msg, ...sanitizedArgs);
};

let logger: Logger;
let spectral: SpectralLogger;

function initLogger(): void {
  if (spectral) return;
  spectral = new SpectralLogger();

  logger = {
    info: (msg: string, ...args: unknown[]) => spectral.info(formatSanitized(msg, ...args)),
    error: (msg: string, ...args: unknown[]) => spectral.error(formatSanitized(msg, ...args)),
    warn: (msg: string, ...args: unknown[]) => spectral.warn(formatSanitized(msg, ...args)),
    debug: (msg: string, ...args: unknown[]) => spectral.debug(formatSanitized(msg, ...args)),
    trace: (msg: string, ...args: unknown[]) => spectral.debug(formatSanitized(msg, ...args)),
    child: () => getLogger(),
  };
}

function configure(config?: Partial<OrgNotePublishedConfig>): void {
  if (!config) return;

  if (config.debug) {
    spectral.configure({ debugMode: true });
  }

  if (config.logPath) {
    const dirName = dirname(config.logPath);
    const fileName = config.logPath.split('/').pop() || 'orgnote.log';
    const filePath = resolveHome(dirName) + '/' + fileName;

    const hasFilePlugin = spectral.getPlugins().some(p => p instanceof FileLoggerPlugin);
    
    if (!hasFilePlugin) {
      spectral.use(new FileLoggerPlugin({ filePath }));
    }
  }
}

export function getLogger(
  config: Partial<OrgNotePublishedConfig> = {}
): Logger {
  if (!logger) {
    initLogger();
  }
  configure(config);
  return logger;
}

