export const getUniqueFileName = (
  existingFileNames: string[],
  fileExt = '.org',
  filePrefix = 'untitled-note',
): string => {
  let initialName = `${filePrefix}${fileExt}`;

  let inc = 0;
  while (existingFileNames.includes(`${initialName}`)) {
    inc++;
    initialName = `${filePrefix}-${inc}${fileExt}`;
  }

  return initialName;
};
