import { DefaultCommands, isPresent, type OrgNoteApi, type LogLevel } from 'orgnote-api';

type MinLevelProvider = () => LogLevel;
type Logger = OrgNoteApi['utils']['logger'];
type ErrorReporterNotifications = Pick<
  ReturnType<OrgNoteApi['core']['useNotifications']>,
  'notify'
>;
type CommandExecutor = (command: string) => void | Promise<void>;
type StoreDef = ReturnType<OrgNoteApi['core']['useNotifications']>;
type NotificationConfig = Parameters<StoreDef['notify']>[0];
type ReportOptions = { level?: LogLevel; notification?: NotificationConfig };

const LOG_LEVEL_TO_VARIANT: Record<LogLevel, 'danger' | 'warning' | 'info'> = {
  error: 'danger',
  warn: 'warning',
  info: 'info',
  debug: 'info',
  trace: 'info',
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

const shouldNotify = (level: LogLevel, minLevel: LogLevel): boolean =>
  LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[minLevel];

const toStyleVariant = (level: LogLevel) => LOG_LEVEL_TO_VARIANT[level];

interface ResultWithError<E> {
  error: E;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && isPresent(v);
const isError = (v: unknown): v is Error => v instanceof Error;
interface AxiosLikeError {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const hasResponseDataMessage = (v: unknown): v is AxiosLikeError =>
  isRecord(v) &&
  isRecord((v as AxiosLikeError).response) &&
  isRecord((v as AxiosLikeError).response?.data) &&
  typeof (v as AxiosLikeError).response?.data?.message === 'string';

const pickMessage = (v: unknown, fallback: string): string => {
  if (hasResponseDataMessage(v)) {
    const mainMessage = v.message ?? fallback;
    const innerMessage = v.response?.data?.message;
    return `${mainMessage}<br />${innerMessage}`;
  }
  if (isError(v)) return v.message || v.name || fallback;
  if (typeof v === 'string') return v || fallback;
  if (isRecord(v)) {
    const msg = (v as { message?: unknown }).message;
    const name = (v as { name?: unknown }).name;
    if (typeof msg === 'string' && msg) return msg;
    if (typeof name === 'string' && name) return name;
  }
  if (!isPresent(v)) return String(v);
  return String(v) || fallback;
};
const extractCauseDetails = (cause: unknown): unknown => {
  if (!isError(cause)) {
    return cause;
  }
  return {
    name: cause.name,
    message: cause.message,
    stack: cause.stack,
    cause: cause.cause ? extractCauseDetails(cause.cause) : undefined,
  };
};

const toLogContext = (v: unknown): Record<string, unknown> => {
  if (isError(v)) {
    return {
      name: v.name,
      message: v.message,
      stack: v.stack,
      cause: v.cause ? extractCauseDetails(v.cause) : undefined,
    };
  }
  
  if (isRecord(v)) {
    const result: Record<string, unknown> = {};
    if ('name' in v) result.name = v.name;
    if ('message' in v) result.message = v.message;
    if ('stack' in v) result.stack = v.stack;
    if ('cause' in v) result.cause = v.cause;
    
    if (Object.keys(result).length === 0) {
      return { details: v };
    }
    return result;
  }
  
  if (typeof v === 'string') {
    return { message: v };
  }
  
  return { rawValue: String(v) };
};

const createOnClick = (executeCommand: CommandExecutor) => () =>
  executeCommand(DefaultCommands.SHOW_LOGS);

const createReportFunction =
  (
    logger: Logger,
    notifications: ErrorReporterNotifications,
    level: LogLevel,
    executeCommand: CommandExecutor,
    getMinLevel: MinLevelProvider,
  ) =>
  (error: unknown, options?: ReportOptions): void => {
    const message = pickMessage(error, 'Unknown error');
    const context = toLogContext(error);
    const lvl = options?.level ?? level;
    logger[lvl](message, context);
    if (!shouldNotify(lvl, getMinLevel())) return;
    const base: NotificationConfig = {
      message,
      level: toStyleVariant(lvl),
      onClick: createOnClick(executeCommand),
    } as NotificationConfig;
    const provided = options?.notification;
    const finalConfig: NotificationConfig = provided
      ? ({
          ...provided,
          message: provided.message ?? base.message,
          level: (provided.level as NotificationConfig['level']) ?? base.level,
          onClick: provided.onClick ?? base.onClick,
        } as NotificationConfig)
      : base;
    notifications.notify(finalConfig);
  };

const createReportResultFunction =
  (
    logger: Logger,
    notifications: ErrorReporterNotifications,
    level: LogLevel,
    executeCommand: CommandExecutor,
    getMinLevel: MinLevelProvider,
  ) =>
  <E>(result: ResultWithError<E>, message: string, options?: ReportOptions): void => {
    const error = new Error(message, { cause: result.error });
    const lvl = options?.level ?? level;
    logger[lvl](error.message, {
      cause: error.cause,
      stack: error.stack,
    });
    if (!shouldNotify(lvl, getMinLevel())) return;
    const base: NotificationConfig = {
      message: error.message,
      level: toStyleVariant(lvl),
      onClick: createOnClick(executeCommand),
    } as NotificationConfig;
    const provided = options?.notification;
    const finalConfig: NotificationConfig = provided
      ? ({
          ...provided,
          message: provided.message ?? base.message,
          level: (provided.level as NotificationConfig['level']) ?? base.level,
          onClick: provided.onClick ?? base.onClick,
        } as NotificationConfig)
      : base;
    notifications.notify(finalConfig);
  };

const DEFAULT_MIN_LEVEL: LogLevel = 'info';

const createErrorReporter = (
  logger: Logger,
  notifications: ErrorReporterNotifications,
  executeCommand: CommandExecutor,
  getMinLevel: MinLevelProvider = () => DEFAULT_MIN_LEVEL,
) => ({
  report: (error: unknown, options?: ReportOptions): void => {
    const reportFn = createReportFunction(logger, notifications, 'error', executeCommand, getMinLevel);
    reportFn(error, options);
  },

  reportResult: <E>(result: ResultWithError<E>, message: string, options?: ReportOptions): void => {
    const reportResultFn = createReportResultFunction(
      logger,
      notifications,
      'error',
      executeCommand,
      getMinLevel,
    );
    reportResultFn(result, message, options);
  },

  reportError: (error: unknown, notification?: NotificationConfig): void => {
    const reportFn = createReportFunction(logger, notifications, 'error', executeCommand, getMinLevel);
    reportFn(error, { notification });
  },

  reportWarning: (error: unknown, notification?: NotificationConfig): void => {
    const reportFn = createReportFunction(logger, notifications, 'warn', executeCommand, getMinLevel);
    reportFn(error, { notification });
  },

  reportInfo: (error: unknown, notification?: NotificationConfig): void => {
    const reportFn = createReportFunction(logger, notifications, 'info', executeCommand, getMinLevel);
    reportFn(error, { notification });
  },

  reportCritical: (error: unknown, meta?: Record<string, unknown>): void => {
    const message = pickMessage(error, 'Critical error');
    const errorContext = toLogContext(error);
    
    const metaStack = isRecord(meta) && typeof (meta as { stack?: unknown }).stack === 'string'
      ? (meta as { stack: string }).stack
      : undefined;
    
    let stack: string | undefined;
    if (isError(error) && error.stack) {
      stack = error.stack;
    } else if (isRecord(error) && typeof (error as { stack?: unknown }).stack === 'string') {
      stack = (error as { stack: string }).stack;
    } else if (metaStack) {
      stack = metaStack;
    }
    
    const context = { 
      ...errorContext, 
      ...meta,
      stack: stack ?? metaStack,
      rawError: isError(error) ? undefined : String(error),
    };
    
    logger.error(`FATAL: ${message}`, context);
    
    if (stack) {
      console.error('Critical error stack trace:', stack);
    } else {
      console.error('Critical error (no stack):', error, meta);
    }
    
    notifications.notify({
      message: `Critical error: ${message}`,
      level: 'danger',
      timeout: 0,
      onClick: createOnClick(executeCommand),
    });
  },
});

type ErrorReporter = ReturnType<typeof createErrorReporter>;

export type { ErrorReporterNotifications, ErrorReporter };
export { createErrorReporter };
