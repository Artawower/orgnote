import { isFileImage, isFileNameContainUuid, uniquifyFileName } from './tools.js';
import { existsSync, renameSync } from 'fs';
import { join } from 'path';
export const createLinkMiddleware = (dirPath) => (orgData) => {
    const isNotLink = orgData.type !== 'link';
    const isNotFile = orgData.linkType !== 'file';
    if (isNotLink ||
        isNotFile ||
        !isFileImage(orgData.path) ||
        isFileNameContainUuid(orgData.path) ||
        !existsSync(join(dirPath, orgData.path))) {
        return orgData;
    }
    try {
        const newFileName = uniquifyFileName(orgData.path);
        renameSync(join(dirPath, orgData.path), join(dirPath, newFileName));
        orgData.path = newFileName;
        orgData.rawLink = newFileName;
    }
    catch (e) {
        if (e.code !== 'ENOENT') {
            throw e;
        }
    }
    return orgData;
};
//# sourceMappingURL=middleware.js.map