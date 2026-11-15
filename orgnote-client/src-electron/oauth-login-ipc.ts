import { ipcMain, net, shell } from 'electron';
import { to } from 'orgnote-api/utils';

export interface OAuthLoginResult {
  redirectUrl: string;
  error?: string;
}

interface RegisterOAuthLoginIpcOptions {
  allowedOrigins: readonly string[];
}

const safeParseUrl = to((url: string) => new URL(url));

const isAllowedAuthUrl = (url: string, allowedOrigins: readonly string[]): boolean => {
  const parsedUrl = safeParseUrl(url);
  if (parsedUrl.isErr()) return false;
  return allowedOrigins.includes(parsedUrl.value.origin);
};

export function registerOAuthLoginIpc(options: RegisterOAuthLoginIpcOptions): void {
  const safeFetch = to((url: string) => net.fetch(url));
  const safeParseJson = to((response: Awaited<ReturnType<typeof net.fetch>>) =>
    response.json() as Promise<{ data?: { redirectUrl?: string } }>,
  );
  const safeOpenExternal = to((url: string) => shell.openExternal(url));

  ipcMain.handle('oauth-login', async (_event, authUrl: string): Promise<OAuthLoginResult> => {
    if (!isAllowedAuthUrl(authUrl, options.allowedOrigins)) {
      console.error('OAuth URL not in allowed origins:', authUrl);
      return { redirectUrl: '', error: 'Invalid auth URL' };
    }

    const response = await safeFetch(authUrl);
    if (response.isErr()) return { redirectUrl: '', error: 'Auth request failed' };

    const data = await safeParseJson(response.value);
    if (data.isErr()) return { redirectUrl: '', error: 'Auth request failed' };

    const redirectUrl = data.value?.data?.redirectUrl;
    if (!redirectUrl) return { redirectUrl: '', error: 'No redirect URL received from auth server' };

    const opened = await safeOpenExternal(redirectUrl);
    if (opened.isErr()) return { redirectUrl: '', error: 'Auth request failed' };

    return { redirectUrl: '' };
  });
}

