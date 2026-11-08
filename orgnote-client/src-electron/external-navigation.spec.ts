import type { HandlerDetails, WebContents } from 'electron';
import { afterEach, expect, test, vi } from 'vitest';
import { configureExternalNavigation } from './external-navigation';

type OpenExternalUrl = Parameters<typeof configureExternalNavigation>[1];
type WindowOpenHandler = Parameters<WebContents['setWindowOpenHandler']>[0];

const createHandlerDetails = (url: string): HandlerDetails => ({
  url,
  frameName: '',
  features: '',
  disposition: 'new-window',
  referrer: { policy: 'no-referrer', url: '' },
});

const registerWindowOpenHandler = (openExternalUrl: OpenExternalUrl): WindowOpenHandler => {
  const handlers: WindowOpenHandler[] = [];
  const webContents: Pick<WebContents, 'setWindowOpenHandler'> = {
    setWindowOpenHandler: (handler) => {
      handlers.push(handler);
    },
  };
  configureExternalNavigation(webContents, openExternalUrl);

  const handler = handlers.at(0);
  if (!handler) throw new TypeError('External navigation handler was not registered');
  return handler;
};

afterEach(() => {
  vi.restoreAllMocks();
});

test('configureExternalNavigation opens HTTP links in the system browser and denies a child window', () => {
  const openExternalUrl = vi.fn<OpenExternalUrl>().mockResolvedValue(undefined);
  const handler = registerWindowOpenHandler(openExternalUrl);

  const responses = ['http://example.com/path', 'https://example.com/path'].map((url) =>
    handler(createHandlerDetails(url)),
  );

  expect(responses).toEqual([{ action: 'deny' }, { action: 'deny' }]);
  expect(openExternalUrl.mock.calls).toEqual([
    ['http://example.com/path'],
    ['https://example.com/path'],
  ]);
});

test('configureExternalNavigation denies unsupported and malformed URLs', () => {
  const openExternalUrl = vi.fn<OpenExternalUrl>().mockResolvedValue(undefined);
  const handler = registerWindowOpenHandler(openExternalUrl);

  const responses = ['file:///tmp/note.org', 'javascript:alert(1)', 'not a url'].map((url) =>
    handler(createHandlerDetails(url)),
  );

  expect(responses).toEqual([{ action: 'deny' }, { action: 'deny' }, { action: 'deny' }]);
  expect(openExternalUrl).not.toHaveBeenCalled();
});

test('configureExternalNavigation reports a sanitized system browser failure cause', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const failure = Object.assign(
    new TypeError('Open failed for https://example.com/private?token=secret'),
    { code: 'ERR_OPEN_EXTERNAL' },
  );
  const openExternalUrl = vi.fn<OpenExternalUrl>().mockRejectedValue(failure);
  const handler = registerWindowOpenHandler(openExternalUrl);

  expect(handler(createHandlerDetails('https://example.com/path'))).toEqual({ action: 'deny' });
  await Promise.resolve();

  expect(consoleError).toHaveBeenCalledWith('Failed to open external URL in the system browser', {
    name: 'TypeError',
    message: 'Open failed for [redacted-url]',
    code: 'ERR_OPEN_EXTERNAL',
  });
});

test('configureExternalNavigation does not log unknown rejection values', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const openExternalUrl = vi
    .fn<OpenExternalUrl>()
    .mockRejectedValue('https://example.com/private?token=secret');
  const handler = registerWindowOpenHandler(openExternalUrl);

  handler(createHandlerDetails('https://example.com/path'));
  await Promise.resolve();

  expect(consoleError).toHaveBeenCalledWith('Failed to open external URL in the system browser', {
    name: 'UnknownRejection',
    message: 'Rejected with string',
  });
});
