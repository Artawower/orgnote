import {
  uint8ArrayToBase64,
  type ExtensionAssetDescriptor,
  type ExtensionManifest,
  type GitRepoHandle,
} from 'orgnote-api';
import { runWithConcurrency } from 'orgnote-api/utils';
import type { ExtensionRuntimeAsset } from 'src/composables/use-extension-runtime-files';

const ASSET_FETCH_CONCURRENCY = 8;

export class ExtensionAssetSizeError extends Error {
  constructor(descriptor: ExtensionAssetDescriptor, actualSize: number) {
    super(
      `Extension asset size mismatch for ${descriptor.path}: expected ${descriptor.size}, received ${actualSize}`,
    );
    this.name = 'ExtensionAssetSizeError';
  }
}

export class ExtensionAssetIntegrityError extends Error {
  constructor(path: string) {
    super(`Extension asset integrity mismatch for ${path}`);
    this.name = 'ExtensionAssetIntegrityError';
  }
}

const getIntegrity = async (content: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', content);
  return `sha256-${uint8ArrayToBase64(new Uint8Array(digest))}`;
};

const fetchAsset = async (
  repo: GitRepoHandle,
  descriptor: ExtensionAssetDescriptor,
  baseDirectory: string,
): Promise<ExtensionRuntimeAsset> => {
  const content = await repo.readFile(`${baseDirectory}assets/${descriptor.path}`, 'binary');
  if (content.byteLength !== descriptor.size) {
    throw new ExtensionAssetSizeError(descriptor, content.byteLength);
  }
  if ((await getIntegrity(content)) !== descriptor.integrity) {
    throw new ExtensionAssetIntegrityError(descriptor.path);
  }
  return { descriptor, content };
};

export const fetchExtensionRuntimeAssets = (
  repo: GitRepoHandle,
  manifest: ExtensionManifest,
  baseDirectory: string,
): Promise<ExtensionRuntimeAsset[]> =>
  runWithConcurrency(manifest.assets ?? [], ASSET_FETCH_CONCURRENCY, (descriptor) =>
    fetchAsset(repo, descriptor, baseDirectory),
  );
