import {
  array,
  check,
  integer,
  minLength,
  minValue,
  number,
  object,
  pipe,
  regex,
  string,
  type InferOutput,
} from 'valibot';
import { ORGNOTE_EXTENSION_RUNTIME_ROOT_PATH } from '../constants/system-paths';

const MEDIA_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const SHA256_INTEGRITY_PATTERN = /^sha256-[A-Za-z0-9+/]{43}=$/;

const isSafeAssetPath = (path: string): boolean => {
  if (path.includes('\\') || path.includes('\0') || path.includes(':')) return false;
  return path
    .split('/')
    .every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
};

export const EXTENSION_ASSET_SCHEMA = object({
  path: pipe(string(), minLength(1), check(isSafeAssetPath)),
  mediaType: pipe(string(), regex(MEDIA_TYPE_PATTERN)),
  size: pipe(number(), integer(), minValue(0)),
  integrity: pipe(string(), regex(SHA256_INTEGRITY_PATTERN)),
});

export type ExtensionAssetDescriptor = InferOutput<typeof EXTENSION_ASSET_SCHEMA>;

const hasUniqueAssetPaths = (assets: ExtensionAssetDescriptor[]): boolean =>
  new Set(assets.map((asset) => asset.path)).size === assets.length;

export const EXTENSION_ASSETS_SCHEMA = pipe(
  array(EXTENSION_ASSET_SCHEMA),
  check(hasUniqueAssetPaths),
);

interface ExtensionRuntimeIdentity {
  readonly name: string;
  readonly version: string;
  readonly assets?: readonly ExtensionAssetDescriptor[];
}

const ENTRY_FILE_NAME = 'index.js';
const ASSET_DIRECTORY = 'assets';

const encodePathSegment = (segment: string): string => encodeURIComponent(segment);

export class ExtensionAssetNotDeclaredError extends Error {
  constructor(path: string) {
    super(`Extension asset is not declared: ${path}`);
    this.name = 'ExtensionAssetNotDeclaredError';
  }
}

export const getExtensionRuntimeRootPath = (): string => ORGNOTE_EXTENSION_RUNTIME_ROOT_PATH;

export const getExtensionRootPath = (extensionName: string): string =>
  `${ORGNOTE_EXTENSION_RUNTIME_ROOT_PATH}/${encodePathSegment(extensionName)}`;

export const getExtensionRuntimePath = (extension: ExtensionRuntimeIdentity): string =>
  `${getExtensionRootPath(extension.name)}/${encodePathSegment(extension.version)}`;

export const getExtensionEntryPath = (extension: ExtensionRuntimeIdentity): string =>
  `${getExtensionRuntimePath(extension)}/${ENTRY_FILE_NAME}`;

export const getExtensionAssetPath = (
  extension: ExtensionRuntimeIdentity,
  path: string
): string => {
  const asset = extension.assets?.find((candidate) => candidate.path === path);
  if (!asset) throw new ExtensionAssetNotDeclaredError(path);
  return `${getExtensionRuntimePath(extension)}/${ASSET_DIRECTORY}/${asset.path}`;
};
