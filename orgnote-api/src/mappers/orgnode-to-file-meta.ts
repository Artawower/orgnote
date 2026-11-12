import { OrgNode } from 'org-mode-ast';
import { DiskFile, FileMeta } from 'src/models';
import { splitPath } from 'src/utils';

export function orgnodeToFileMeta(
  orgnode: OrgNode,
  fileInfo: DiskFile
): FileMeta {
  return {
    id: orgnode.meta.id ?? '',
    title: orgnode.meta.title,
    description: orgnode.meta.description,
    tags: orgnode.meta.fileTags,
    filePath: splitPath(fileInfo.path),
    touchedAt: fileInfo.atime && new Date(fileInfo.atime).toISOString(),
    updatedAt: new Date(Math.max(fileInfo.mtime, fileInfo.ctime)).toISOString(),
    createdAt: fileInfo.ctime && new Date(fileInfo.ctime).toISOString(),
  };
}
