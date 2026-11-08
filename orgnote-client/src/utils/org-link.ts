import {
  buildBufferUri,
  splitPath,
  toAbsolutePath,
  RouteNames,
  type BufferScheme,
} from 'orgnote-api';
import { getHostRelatedPath } from './get-host-related-path';
import { to } from 'orgnote-api/utils';
import type { ResultAsync } from 'neverthrow';
import { getFileDirPath } from './get-file-dir-path';

const idLinkPrefix = 'id:';
const defaultScheme = 'file';
const orgLocationSeparator = '::';
const pathSegmentSeparator = '/';
const filePrefix = 'file:';
const attachmentPrefix = 'attachment:';

const schemePrefixPattern = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const relativeOrAbsoluteFileLinkPattern = /^(?:\.{1,2}\/|\/)/;
const externalUrlPattern = /^(?:https?:\/\/|data:)/i;

const routeNameToScheme: Record<string, BufferScheme> = {
  [RouteNames.Remote]: 'remote',
  [RouteNames.Embedded]: 'embedded',
  [RouteNames.File]: 'file',
};

export type FileMetaGetter = (id: string) => Promise<{ filePath: string[] } | undefined>;

export interface OrgLinkContext {
  scheme: BufferScheme;
  currentFilePath: string;
}

export const resolveBufferSchemeFromRouteName = (routeName?: string): BufferScheme =>
  routeName ? (routeNameToScheme[routeName] ?? defaultScheme) : defaultScheme;

export const extractOrgLinkTarget = (raw: string): string => {
  const match = raw.match(/\[\[([^\]]+)\]/);
  return match?.[1] ?? raw;
};

export const normalizeOrgResourcePath = (path: string): string => {
  if (path.startsWith(filePrefix)) {
    return path.slice(filePrefix.length);
  }

  if (path.startsWith(attachmentPrefix)) {
    return path.slice(attachmentPrefix.length);
  }

  return path;
};

const stripOrgLocationSuffix = (rawLink: string): string => {
  const separatorIndex = rawLink.indexOf(orgLocationSeparator);
  if (separatorIndex === -1) {
    return rawLink;
  }

  return rawLink.slice(0, separatorIndex);
};

const normalizeAbsolutePath = (path: string): string =>
  toAbsolutePath(
    splitPath(path)
      .reduce<string[]>((acc, segment) => {
        if (segment === '.') {
          return acc;
        }

        if (segment === '..') {
          acc.pop();
          return acc;
        }

        acc.push(segment);
        return acc;
      }, [])
      .join(pathSegmentSeparator),
  );

export const isInternalLink = (rawLink: string): boolean =>
  rawLink.startsWith(idLinkPrefix) && rawLink.length > idLinkPrefix.length;

export const isExternalResourceLink = (path: string): boolean => externalUrlPattern.test(path);

export const isRelativeFileLink = (rawLink: string): boolean => {
  const target = stripOrgLocationSuffix(rawLink);
  if (schemePrefixPattern.test(target)) {
    return false;
  }

  return relativeOrAbsoluteFileLinkPattern.test(target);
};

export const extractInternalId = (rawLink: string): string => {
  if (!isInternalLink(rawLink)) return '';
  return rawLink.slice(idLinkPrefix.length);
};

export const resolveRelativeOrgFilePath = (rawLink: string, currentFilePath: string): string => {
  const target = stripOrgLocationSuffix(rawLink);
  if (target.startsWith(pathSegmentSeparator)) {
    return normalizeAbsolutePath(target);
  }

  const basePath = getFileDirPath(currentFilePath);
  return normalizeAbsolutePath(`${basePath}${pathSegmentSeparator}${target}`);
};

export const buildContextualBufferUri = (rawLink: string, context: OrgLinkContext): string => {
  const path = resolveRelativeOrgFilePath(rawLink, context.currentFilePath);
  return buildBufferUri(context.scheme, path);
};

export const resolveRemoteResourceUrl = (rawLink: string, currentFilePath: string): string => {
  const path = resolveRelativeOrgFilePath(rawLink, currentFilePath);
  return getHostRelatedPath(path);
};

export const resolveInternalNoteUri = (
  noteId: string,
  getFileMeta: FileMetaGetter,
): ResultAsync<string | undefined, Error> =>
  to(
    getFileMeta,
    `Failed to resolve note: ${noteId}`,
  )(noteId).map((meta) => {
    if (!meta) return undefined;
    return buildBufferUri(defaultScheme, meta.filePath.join('/'));
  });
