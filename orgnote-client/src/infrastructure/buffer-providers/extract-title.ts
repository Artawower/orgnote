export const createTitleExtractor =
  (fallback: string) =>
  (path: string): string => {
    const fileName = path.split('/').pop() ?? '';
    return fileName.replace(/\.[^.]+$/, '') || fallback;
  };
