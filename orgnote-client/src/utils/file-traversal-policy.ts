import { ORGNOTE_SYSTEM_ROOT_PATH, type DiskFile } from 'orgnote-api';
import { isPathInsideRoot } from './is-path-inside-root';

export const FILE_VISIT_DECISIONS = {
  INCLUDE: 'include',
  DESCEND_ONLY: 'descend-only',
  PRUNE: 'prune',
} as const;

export type FileVisitDecision =
  (typeof FILE_VISIT_DECISIONS)[keyof typeof FILE_VISIT_DECISIONS];

export type FileTraversalPolicy = (file: DiskFile) => FileVisitDecision;

const SYSTEM_ROOT_PATH = `/${ORGNOTE_SYSTEM_ROOT_PATH}`;

export const includeAllFilesTraversalPolicy: FileTraversalPolicy = () =>
  FILE_VISIT_DECISIONS.INCLUDE;

export const userContentTraversalPolicy: FileTraversalPolicy = (file) =>
  isPathInsideRoot(file.path, SYSTEM_ROOT_PATH)
    ? FILE_VISIT_DECISIONS.PRUNE
    : FILE_VISIT_DECISIONS.INCLUDE;

export const createFileSearchTraversalPolicy = (
  rootPath: string,
): FileTraversalPolicy =>
  isPathInsideRoot(rootPath, SYSTEM_ROOT_PATH)
    ? includeAllFilesTraversalPolicy
    : userContentTraversalPolicy;
