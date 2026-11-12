import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { to } from 'orgnote-api/utils';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

const getResourcesPath = (): string => {
  if (process.env.DEV) {
    return path.resolve(currentDir, '../../src-electron/resources');
  }
  return path.join(process.resourcesPath ?? currentDir, 'resources');
};

const AUTH_SUCCESS_HTML_PATH = path.join(getResourcesPath(), 'auth-success.html');
const AUTH_LOGIN_PATH = '/auth/login';
const FALLBACK_HTML =
  '<html><body style="background:#9356e8;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><h2 style="color:#fff">Authentication successful!</h2></body></html>';

interface StartAuthCallbackServerOptions {
  port: number;
  host: string;
  onRoute: (route: string) => void;
  onFocus?: () => void;
}

const safeReadFile = to((filePath: string) => fs.readFileSync(filePath, 'utf-8'));

const loadAuthSuccessHtml = (): string => {
  const result = safeReadFile(AUTH_SUCCESS_HTML_PATH);
  return result.isOk() ? result.value : FALLBACK_HTML;
};

const isAuthLoginPath = (pathname: string): boolean => pathname === AUTH_LOGIN_PATH;

export function startAuthCallbackServer(options: StartAuthCallbackServerOptions): () => void {
  const authSuccessHtml = loadAuthSuccessHtml();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '', `http://${options.host}:${options.port}`);

    if (!isAuthLoginPath(url.pathname)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(authSuccessHtml);

    options.onRoute(AUTH_LOGIN_PATH + url.search);
    options.onFocus?.();
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Auth callback port ${options.port} is already in use`);
      return;
    }
    console.error('Auth callback server error:', err);
  });

  server.listen(options.port, options.host);
  return () => server.close();
}
