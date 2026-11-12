export type FileContentTransform = (
  content: Uint8Array
) => Uint8Array | undefined | Promise<Uint8Array | undefined>;

export interface FileContent {
  read(path: string): Promise<Uint8Array>;
  write(path: string, content: Uint8Array): Promise<void>;
  update(path: string, transform: FileContentTransform): Promise<boolean>;
}

export type UseFileContent = () => FileContent;
