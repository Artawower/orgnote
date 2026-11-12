export type UrlTarget = 'native-app' | 'web';

export interface BuildOrgNoteUrlOptions {
  query?: Record<string, string>;
  target?: UrlTarget;
}

export type BuildOrgNoteUrl = (path: string, options?: BuildOrgNoteUrlOptions) => string;
