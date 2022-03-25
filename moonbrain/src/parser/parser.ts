import { Keyword } from 'orga';
import { ElementType, GreaterElementType, Headline, OrgData } from 'uniorg';
import { Note, NoteHeading } from './models';

const FILETAGS_DEVIDER = ':';

interface NoteNodeChunk {
  notes?: Note[];
  headings?: NoteHeading[];
  title?: string;
  tags?: string[];
  description?: string;
}

const sectionHandler = (content: OrgData): NoteNodeChunk[] =>
  content.children.reduce((chunks, content) => [...chunks, ...(handlers[content.type]?.(content) || [])], []);

const headlineHandler = (content: Headline): NoteNodeChunk[] => [
  { headings: [{ text: content.rawValue, level: content.level }] },
];

const keywordHandlers: { [key: string]: (data: Keyword) => NoteNodeChunk[] } = {
  title: (content: Keyword) => [{ title: content.value }],
  filetags: (content: Keyword) => [{ tags: content.value.split(FILETAGS_DEVIDER).filter((v) => v) }],
  description: (content: Keyword) => [{ description: content.value }],
};

const keywordHandler = (content: Keyword) => keywordHandlers[content.key.toLocaleLowerCase()]?.(content);

type HandlerType = GreaterElementType & ElementType;

const handlers: { [key in HandlerType['type']]?: (data: GreaterElementType) => NoteNodeChunk[] } = {
  // 'property-drawer': parseProperties,
  section: sectionHandler,
  headline: headlineHandler,
  keyword: keywordHandler,
};

const newEmptyNote = (): Partial<Note> => {
  return {
    meta: {
      headings: [],
      tags: [],
    },
  };
};

export const collectNotes = (content: OrgData): Note[] => {
  const chunks = handlers['section'](content);
  // TODO: master real type
  const note: Note = chunks.reduce((acc: Note, cn: NoteNodeChunk) => {
    const headings = cn.headings ?? [];
    const tags = cn.tags ?? [];
    acc.meta.headings = [...acc.meta.headings, ...headings];
    acc.meta.title = acc.meta.title ?? cn.title;
    acc.meta.description = acc.meta.description ?? cn.description;
    acc.meta.tags = [...acc.meta.tags, ...tags];
    return acc;
  }, newEmptyNote());

  return [note];
};
