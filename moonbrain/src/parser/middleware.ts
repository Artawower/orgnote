import { Link, OrgNode } from 'uniorg';
import { isFileImage, uniquifyFileName } from './tools';
import { renameSync } from 'fs';
import { join } from 'path';

// TODO: master rename this builder if need a real builder
export const createLinkMiddleware =
  (dirPath: string) =>
  (orgData: Link): OrgNode => {
    if (orgData.type !== 'link' || orgData.linkType !== 'file' || !isFileImage(orgData.path)) {
      return orgData;
    }

    const newFileName = uniquifyFileName(orgData.path);
    renameSync(join(dirPath, orgData.path), join(dirPath, newFileName));
    orgData.path = newFileName;
    orgData.rawLink = newFileName;
    return orgData;
  };
