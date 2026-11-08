import { net, protocol } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { to } from 'orgnote-api/utils';

interface HistoryFallbackProtocolOptions {
  scheme: string;
  baseDir: string;
}

const toRelativePath = (pathname: string): string =>
  pathname.startsWith('/') ? pathname.slice(1) : pathname;

const toFileUrl = (baseDir: string, relativePath: string): string =>
  pathToFileURL(path.join(baseDir, relativePath)).toString();

export function registerHistoryFallbackProtocol(options: HistoryFallbackProtocolOptions): void {
  const safeFetch = to((url: string) => net.fetch(url));

  protocol.handle(options.scheme, async (request) => {
    const url = new URL(request.url);
    const fileUrl = toFileUrl(options.baseDir, toRelativePath(url.pathname));

    const fileResponse = await safeFetch(fileUrl);
    if (fileResponse.isOk() && fileResponse.value.ok) {
      return fileResponse.value;
    }

    return net.fetch(toFileUrl(options.baseDir, 'index.html'));
  });
}

