export const matchesAllowedExtension = (
  path: string,
  allowedExtensions?: string[],
): boolean => {
  if (!allowedExtensions?.length) return true;
  return allowedExtensions.some((extension) => path.endsWith(extension));
};