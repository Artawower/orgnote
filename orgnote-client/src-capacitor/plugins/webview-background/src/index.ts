import { registerPlugin } from '@capacitor/core';
import type { WebViewBackgroundPlugin } from './definitions';

const WebViewBackground = registerPlugin<WebViewBackgroundPlugin>('WebViewBackground');

export * from './definitions';
export { WebViewBackground };
