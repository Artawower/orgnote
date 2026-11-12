export interface WebViewBackgroundPlugin {
  setBackgroundColor(options: { color: string }): Promise<void>;
}
