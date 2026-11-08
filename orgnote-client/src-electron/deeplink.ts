import { app } from 'electron';
import path from 'path';
import { to } from 'orgnote-api/utils';

interface RegisterDeepLinkingOptions {
  protocolName: string;
  onRoute: (route: string) => void;
  onSecondInstance?: () => void;
}

const safeParseUrl = to((url: string) => new URL(url));

const toRoute = (url: URL): string => `/${url.host}${url.pathname}${url.search}`;

const parseDeepLinkToRoute = (rawUrl: string): string | undefined => {
  const parsed = safeParseUrl(rawUrl);
  if (parsed.isErr()) return;
  return toRoute(parsed.value);
};

const registerProtocolClient = (protocolName: string): void => {
  const args = process.defaultApp && process.argv[1] ? [path.resolve(process.argv[1])] : undefined;
  app.setAsDefaultProtocolClient(protocolName, process.defaultApp ? process.execPath : undefined, args);
};

const getUrlFromCommandLine = (protocolName: string, argv: string[]): string | undefined =>
  argv.find((arg) => arg.startsWith(`${protocolName}://`));

export function registerDeepLinking(options: RegisterDeepLinkingOptions): void {
  registerProtocolClient(options.protocolName);

  app.on('open-url', (event, url) => {
    event.preventDefault();
    const route = parseDeepLinkToRoute(url);
    if (route) options.onRoute(route);
  });

  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', (_event, commandLine) => {
    const url = getUrlFromCommandLine(options.protocolName, commandLine);
    const route = url ? parseDeepLinkToRoute(url) : undefined;
    if (route) options.onRoute(route);
    options.onSecondInstance?.();
  });
}

