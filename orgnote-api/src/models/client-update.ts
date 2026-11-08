export interface Changelog {
  version: string;
  changeLog: string;
  url: string;
}

export interface ChangelogRecord extends Changelog {
  fromVersion?: string;
  detectedAt: string;
  viewedAt?: string;
}
