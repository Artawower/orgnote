import { registerPlugin } from '@capacitor/core';

export interface WebViewBackgroundPlugin {
  setBackgroundColor(options: { color: string }): Promise<void>;
}

export const WebViewBackground = registerPlugin<WebViewBackgroundPlugin>('WebViewBackground');
