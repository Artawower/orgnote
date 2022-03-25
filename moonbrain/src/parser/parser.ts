import { ElementType, GreaterElementType, Headline, OrgData } from 'uniorg';
import { Note, NoteHeading } from './models';

interface NoteNodeChunk {
  notes?: Note[];
  headings: NoteHeading[];
}

const sectionHandler = (content: OrgData): NoteNodeChunk[] =>
  content.children.reduce((chunks, content) => [...chunks, ...(handlers[content.type]?.(content) || [])], []);

const headlineHandler = (content: Headline): NoteNodeChunk[] => [
  { headings: [{ text: content.rawValue, level: content.level }] },
];

type HandlerType = GreaterElementType & ElementType;

const handlers: { [key in HandlerType['type']]?: (data: GreaterElementType) => NoteNodeChunk[] } = {
  // 'property-drawer': parseProperties,
  section: sectionHandler,
  headline: headlineHandler,
};

const newEmptyNote = (): Partial<Note> => {
  return {
    meta: {
      headings: [],
    },
  };
};

export const collectNotes = (content: OrgData): Note[] => {
  const chunks = handlers['section'](content);
  // TODO: master real type
  const note: Note = chunks.reduce((acc: Note, cn: NoteNodeChunk) => {
    acc.meta.headings = [...acc.meta.headings, ...cn.headings];
    return acc;
  }, newEmptyNote());

  return [note];
};
