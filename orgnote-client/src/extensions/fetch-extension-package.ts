import type {
  ExtensionManifest,
  GitProviderInfo,
  GitProviderOptions,
  GitRepoHandle,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { createEsGitProviderInfo } from 'src/infrastructure/git';
import { validateManifest } from 'src/utils/validate-manifest';
import { fetchExtensionRuntimeAssets } from './runtime-assets';
import type {
  ExtensionInstallerRequest,
  FetchedExtensionPackage,
} from './extension-installer-contract';

interface ExtensionPackagePaths {
  readonly entryPath: string;
  readonly manifestPath: string;
  readonly baseDirectory: string;
}

const DIST_DIRECTORY = 'dist';
const ENTRY_FILE_NAME = 'index.js';
const MANIFEST_FILE_NAME = 'manifest.json';

export class ExtensionManifestJsonError extends Error {
  override readonly name = 'ExtensionManifestJsonError';

  constructor(path: string, cause: unknown) {
    super(`Invalid extension manifest JSON: ${path}`, { cause });
  }
}

const resolvePackagePaths = async (repo: GitRepoHandle): Promise<ExtensionPackagePaths> => {
  const baseDirectory = await repo.fileExists(DIST_DIRECTORY) ? `${DIST_DIRECTORY}/` : '';
  return {
    entryPath: `${baseDirectory}${ENTRY_FILE_NAME}`,
    manifestPath: `${baseDirectory}${MANIFEST_FILE_NAME}`,
    baseDirectory,
  };
};

const parseManifest = (content: string, path: string): ExtensionManifest => {
  const parsed = to(
    () => JSON.parse(content) as ExtensionManifest,
    (cause) => new ExtensionManifestJsonError(path, cause),
  )();
  if (parsed.isErr()) throw parsed.error;
  validateManifest(parsed.value);
  return parsed.value;
};

const readManifest = async (
  repo: GitRepoHandle,
  path: string,
): Promise<ExtensionManifest | undefined> => {
  if (!(await repo.fileExists(path))) return undefined;
  return parseManifest(await repo.readFile(path, 'utf8'), path);
};

export const fetchExtensionPackageFromRepo = async (
  repo: GitRepoHandle,
  request: ExtensionInstallerRequest,
): Promise<FetchedExtensionPackage> => {
  const paths = await resolvePackagePaths(repo);
  const rawContent = await repo.readFile(paths.entryPath, 'utf8');
  const manifest = await readManifest(repo, paths.manifestPath);
  if (!manifest) return { rawContent, assets: [] };
  const resolvedManifest = { ...manifest, source: request.source };
  const assets = await fetchExtensionRuntimeAssets(repo, resolvedManifest, paths.baseDirectory);
  return { manifest: resolvedManifest, rawContent, assets };
};

const closeRepoAfter = async <T>(repo: GitRepoHandle, operation: Promise<T>): Promise<T> => {
  const operationResult = await to(() => operation)();
  const closeResult = to(repo.close.bind(repo))();
  if (operationResult.isErr()) throw operationResult.error;
  if (closeResult.isErr()) throw closeResult.error;
  return operationResult.value;
};

export const fetchExtensionPackageFromGit = async (
  request: ExtensionInstallerRequest,
  openRepo: GitProviderInfo['openRepo'] = createEsGitProviderInfo().openRepo,
): Promise<FetchedExtensionPackage> => {
  const options: GitProviderOptions | undefined = request.corsProxy
    ? { corsProxy: request.corsProxy }
    : undefined;
  const repo = await openRepo({
    url: request.source.repo,
    branch: request.source.branch ?? request.source.tag,
  }, options);
  return await closeRepoAfter(repo, fetchExtensionPackageFromRepo(repo, request));
};
