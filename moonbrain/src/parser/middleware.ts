import { OrgNode } from 'uniorg';
import { isFileImage, uniquifyFileName } from './tools';
import { renameSync } from 'fs';

export const linkMiddleware = (orgData: OrgNode): OrgNode => {
  if (orgData.type !== 'link' || orgData.linkType !== 'file' || !isFileImage(orgData.path)) {
    return orgData;
  }

  const newFileName = uniquifyFileName(orgData.path);
  renameSync(orgData.path, newFileName);
  orgData.path = newFileName;
  orgData.rawLink = newFileName;
};
