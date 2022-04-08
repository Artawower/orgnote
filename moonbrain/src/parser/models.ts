import { OrgNode } from 'uniorg';

export interface NoteHeading {
  level: number;
  text: string;
}

export interface NoteLink {
  url: string;
  name: string;
}

export interface NoteMeta {
  previewImg?: string;
  title?: string;
  description?: string;
  headings: NoteHeading[];
  linkedArticles?: NoteLink[];
  active?: boolean;
  externalLinks?: NoteLink[];
  startup?: string;
  tags?: string[];
  images?: string[];
}

export interface LinkedNote {
  id: string;
  title: string;
}

export interface Note {
  id: string;
  meta: NoteMeta;
  content: OrgNode;
}
