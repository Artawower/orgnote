export interface NoteProperties {
  active?: boolean;
  id?: string;
  [key: string]: string | boolean | number;
}

export interface NoteKeywords {
  title?: string;
  [key: string]: string | boolean | number;
}

export interface NoteHeading {
  level: number;
  text: string;
}

export interface NoteMeta {
  previewImg?: string;
  title?: string;
  description?: string;
  headings: NoteHeading[];
  // TODO: temporary string
  linkedArticles?: string[];
  // TODO: think about whether this properties is needed
  properties?: NoteProperties;
  keywords?: NoteKeywords;
  externalLinks?: string[];
  startup?: string;
}

export interface LinkedNote {
  id: string;
  title: string;
}

export interface Note {
  id: string;
  meta: NoteMeta;
  content: any;
}
