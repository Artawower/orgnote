export interface Logger {
  info: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  debug: (msg: string, ...args: unknown[]) => void;
  trace: (msg: string, ...args: unknown[]) => void;
  child: (bindings: Record<string, unknown>) => Logger;
}