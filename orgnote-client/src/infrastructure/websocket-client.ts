import { WebSocketClient } from 'orgnote-api';
import { logger } from 'src/boot/logger';
import { getWebSocketUrl } from 'src/utils/server-endpoints';

export let wsClient: WebSocketClient;

export const initWebSocketClient = (options?: {
  wsUrl?: string;
  apiUrl?: string;
}) => {
  const wsUrl = getWebSocketUrl({
    configuredWsUrl: options?.wsUrl,
    configuredApiUrl: options?.apiUrl,
  });

  if (wsClient) {
    wsClient.disconnect();
  }

  wsClient = new WebSocketClient(wsUrl, logger);
  return wsClient;
};
