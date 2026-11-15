import { to } from 'orgnote-api/utils';
import { hasWindow } from 'src/utils/platform-specific';

const wsPathLocal = '/api/ws/events';
const defaultApiPath = '/v1';
const httpProtocols = new Set(['http:', 'https:']);

export const resolveApiBaseUrl = (
  configured: string | undefined,
  fallback: string | undefined,
  protocol?: string,
): string => {
  const configuredUrl = configured?.trim();
  const fallbackUrl = fallback?.trim() || defaultApiPath;
  if (!configuredUrl) return fallbackUrl;
  if (!configuredUrl.startsWith('/') || !protocol || httpProtocols.has(protocol)) {
    return configuredUrl;
  }
  return fallbackUrl.startsWith('http') ? fallbackUrl : configuredUrl;
};

export const getApiBaseUrl = (configured?: string): string =>
  resolveApiBaseUrl(
    configured,
    import.meta.env.VITE_API_URL,
    hasWindow() ? window.location.protocol : undefined,
  );

export const getApiPublicUrl = (configured?: string): string => {
  const baseUrl = getApiBaseUrl(configured);

  if (baseUrl.startsWith('http')) {
    return baseUrl;
  }

  if (hasWindow()) {
    return new URL(baseUrl, window.location.origin).toString();
  }

  return baseUrl;
};

const toWsProtocol = (url: string): string => url.replace(/^http/, 'ws');

const deriveWsFromApiUrl = (apiUrl?: string): string => {
  const parsed = to(() => new URL(getApiPublicUrl(apiUrl)))();

  if (parsed.isErr()) {
    throw new Error(`Invalid WebSocket URL derived from: ${apiUrl}`);
  }

  const url = parsed.value;
  url.protocol = toWsProtocol(url.protocol);
  const isLocalDevApi = getApiBaseUrl(apiUrl) === '/v1';
  url.pathname = isLocalDevApi ? wsPathLocal : url.pathname.replace(/\/v\d+\/?$/, '/ws/events');

  return url.toString();
};

export const getWebSocketUrl = (options?: {
  configuredWsUrl?: string;
  configuredApiUrl?: string;
}): string => {
  const wsUrl = options?.configuredWsUrl?.trim() || import.meta.env.WS_URL;

  if (wsUrl) {
    return toWsProtocol(wsUrl);
  }

  return deriveWsFromApiUrl(options?.configuredApiUrl);
};
