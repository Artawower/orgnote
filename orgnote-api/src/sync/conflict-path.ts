const SYNC_CONFLICT_PATH_PATTERN = /\.sync-conflict-\d+-[a-zA-Z0-9_-]+(?:\.[^/]+)?$/;

export const generateConflictPath = (
  path: string,
  deviceName: string = 'device'
): string => {
  const lastDot = path.lastIndexOf('.');
  const extension = lastDot >= 0 ? path.substring(lastDot) : '';
  const basePath = lastDot >= 0 ? path.substring(0, lastDot) : path;
  const safeDeviceName = deviceName.replace(/[^a-zA-Z0-9_-]/g, '_');

  return `${basePath}.sync-conflict-${Date.now()}-${safeDeviceName}${extension}`;
};

export const isSyncConflictPath = (path: string): boolean =>
  SYNC_CONFLICT_PATH_PATTERN.test(path);
