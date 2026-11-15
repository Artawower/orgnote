export interface SafPlugin {
  openDirectoryPicker(): Promise<{ uri: string }>;
  readFile(options: { uri: string; path: string[] }): Promise<{ data: string }>;
  writeFile(options: { uri: string; path: string[]; data: string }): Promise<void>;
  delete(options: { uri: string; path: string[] }): Promise<void>;
  rename(options: { uri: string; oldPath: string[]; newPath: string[] }): Promise<void>;
  fileInfo(options: {
    uri: string;
    path: string[];
  }): Promise<{ name: string; type: 'file' | 'directory'; size: number; mtime: number }>;
  readDir(options: { uri: string; path: string[] }): Promise<{
    files: Array<{
      name: string;
      uri: string;
      type: 'file' | 'directory';
      size: number;
      mtime: number;
    }>;
  }>;
  utime(options: { uri: string; path: string[]; mtime: number }): Promise<void>;
  mkdir(options: { uri: string; path: string[] }): Promise<{ uri: string }>;
}

const wrapPlugin = <T extends object>(plugin: T): T => {
  return new Proxy(plugin, {
    get(target, prop) {
      if (prop === 'then') {
        return undefined;
      }
      return Reflect.get(target, prop);
    },
  });
};

let androidSafInstance: SafPlugin | null = null;

export const getAndroidSaf = async (): Promise<SafPlugin> => {
  if (!androidSafInstance) {
    const { registerPlugin } = await import('@capacitor/core');
    const plugin = registerPlugin<SafPlugin>('SafPlugin');
    androidSafInstance = wrapPlugin(plugin);
  }
  return androidSafInstance;
};
