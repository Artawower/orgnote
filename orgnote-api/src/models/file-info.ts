export interface FileInfo {
  fileName: string;
  filePath: string;
  fileExtension: string;
  updatedAt?: Date;
  createdAt?: Date;
  touchedAt?: Date;
  size: number;
  backlinksPaths?: string[];
  deletedAt?: Date;
  // TODO: delete this field
  uploaded?: boolean;
}
