import type { HandlerDetails, WebContents, WindowOpenHandlerResponse } from 'electron';
import { toOpenableExternalUrl } from '../src/utils/external-url-policy';

const WINDOW_OPEN_DENIED: WindowOpenHandlerResponse = { action: 'deny' };
const OPEN_EXTERNAL_FAILURE_MESSAGE = 'Failed to open external URL in the system browser';
const REDACTED_EXTERNAL_URL = '[redacted-url]';
const UNKNOWN_REJECTION_NAME = 'UnknownRejection';
const EXTERNAL_URL_PATTERN = /https?:\/\/[^\s"'<>]+/giu;
const SAFE_ERROR_CODE_PATTERN = /^[a-z0-9_-]{1,64}$/iu;

type OpenExternalUrl = (url: string) => Promise<void>;

interface OpenExternalFailureContext {
  readonly name: string;
  readonly message: string;
  readonly code?: string | number;
}

const sanitizeDiagnosticText = (value: string): string =>
  value.replace(EXTERNAL_URL_PATTERN, REDACTED_EXTERNAL_URL);

const readSafeErrorCode = (error: Error): string | number | undefined => {
  const code = Reflect.get(error, 'code');
  if (typeof code === 'number') return code;
  return typeof code === 'string' && SAFE_ERROR_CODE_PATTERN.test(code) ? code : undefined;
};

const toOpenExternalFailureContext = (error: unknown): OpenExternalFailureContext => {
  if (!(error instanceof Error)) {
    return { name: UNKNOWN_REJECTION_NAME, message: `Rejected with ${typeof error}` };
  }

  const context = {
    name: sanitizeDiagnosticText(error.name),
    message: sanitizeDiagnosticText(error.message),
  };
  const code = readSafeErrorCode(error);
  return code === undefined ? context : { ...context, code };
};

const reportOpenExternalFailure = (error: unknown): void => {
  console.error(OPEN_EXTERNAL_FAILURE_MESSAGE, toOpenExternalFailureContext(error));
};

const openInSystemBrowser = (openExternalUrl: OpenExternalUrl, url: string): void => {
  void openExternalUrl(url).catch(reportOpenExternalFailure);
};

const createWindowOpenHandler =
  (openExternalUrl: OpenExternalUrl) =>
  (details: HandlerDetails): WindowOpenHandlerResponse => {
    const externalUrl = toOpenableExternalUrl(details.url);
    if (externalUrl) openInSystemBrowser(openExternalUrl, externalUrl.toString());
    return WINDOW_OPEN_DENIED;
  };

export const configureExternalNavigation = (
  webContents: Pick<WebContents, 'setWindowOpenHandler'>,
  openExternalUrl: OpenExternalUrl,
): void => {
  webContents.setWindowOpenHandler(createWindowOpenHandler(openExternalUrl));
};
