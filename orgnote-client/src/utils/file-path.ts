export const fileBaseName = (path: string): string => {
  const name = path.split('/').pop() ?? path;
  return name.endsWith('.org') ? name.slice(0, -4) : name;
};
