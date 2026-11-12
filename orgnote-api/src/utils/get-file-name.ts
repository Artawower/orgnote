export const getFileName = (path: string): string => {
  return path.split('/').pop();
};

export const getFileNameWithoutExtension = (path: string): string => {
  return getFileName(path).split('.').shift();
};

export const getFileExtension = (path: string): string => {
  const fileName = getFileName(path);
  const parts = fileName.split('.');

  if (parts.length < 2) return '';

  return parts[parts.length - 1] ?? '';
};
