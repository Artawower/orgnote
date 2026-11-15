const orgFileExtenstionRegex = /\.org(\.gpg)?$/;
export const isOrgFile = (fileName: string): boolean =>
  orgFileExtenstionRegex.test(fileName);

const orgGpgFileExtenstionRegex = /\.org\.gpg$/;
export const isOrgGpgFile = (fileName: string): boolean =>
  orgGpgFileExtenstionRegex.test(fileName);
