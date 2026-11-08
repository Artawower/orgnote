export interface FileContent {
  read(path: string): Promise<Uint8Array>;
  write(path: string, content: Uint8Array): Promise<void>;
}

export type UseFileContent = () => FileContent;
