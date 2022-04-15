import { OrgData } from 'uniorg';

export interface NoteHeading {
  level: number;
  text: string;
}

export enum NoteCategory {
  Article = 'article',
  Book = 'book',
  Schedule = 'schedule',
}

export interface NoteLink {
  url: string;
  name: string;
}

export interface NoteMeta {
  previewImg?: string;
  title?: string;
  description?: string;
  category?: NoteCategory;
  headings: NoteHeading[];
  linkedArticles?: NoteLink[];
  published?: boolean;
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
  content: OrgData;
}
