import {
  getExtensionAssetPath,
  getExtensionEntryPath,
  getExtensionRootPath,
  getExtensionRuntimePath,
  type ExtensionAssetDescriptor,
  type ExtensionManifest,
} from 'orgnote-api';
import { runWithConcurrency } from 'orgnote-api/utils';
import { useFileSystemStore } from 'src/stores/file-system';

const ASSET_WRITE_CONCURRENCY = 8;

export interface ExtensionRuntimeAsset {
  readonly descriptor: ExtensionAssetDescriptor;
  readonly content: Uint8Array;
}

export interface ExtensionRuntimeFileSystem {
  readFile<TEncoding extends 'utf8' | 'binary'>(
    path: string,
    encoding: TEncoding,
  ): Promise<(TEncoding extends 'utf8' ? string : Uint8Array) | undefined>;
  writeFile(path: string, content: string | Uint8Array): Promise<void>;
  rmdir(path: string): Promise<void>;
}

export interface ExtensionRuntimeFiles {
  write(
    manifest: ExtensionManifest,
    moduleContent: string,
    assets: readonly ExtensionRuntimeAsset[],
  ): Promise<void>;
  readEntry(manifest: ExtensionManifest): Promise<string | undefined>;
  readAsset(manifest: ExtensionManifest, path: string): Promise<Uint8Array | undefined>;
  remove(manifest: ExtensionManifest): Promise<void>;
  removeAll(extensionName: string): Promise<void>;
}

export const useExtensionRuntimeFiles = (
  fileSystem: ExtensionRuntimeFileSystem = useFileSystemStore(),
): ExtensionRuntimeFiles => ({
  write: async (manifest, moduleContent, assets) => {
    await fileSystem.writeFile(getExtensionEntryPath(manifest), moduleContent);
    await runWithConcurrency(assets, ASSET_WRITE_CONCURRENCY, ({ descriptor, content }) =>
      fileSystem.writeFile(getExtensionAssetPath(manifest, descriptor.path), content),
    );
  },
  readEntry: (manifest) => fileSystem.readFile(getExtensionEntryPath(manifest), 'utf8'),
  readAsset: (manifest, path) =>
    fileSystem.readFile(getExtensionAssetPath(manifest, path), 'binary'),
  remove: (manifest) => fileSystem.rmdir(getExtensionRuntimePath(manifest)),
  removeAll: (extensionName) => fileSystem.rmdir(getExtensionRootPath(extensionName)),
});
