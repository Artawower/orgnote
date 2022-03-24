import { ElementType, GreaterElementType, Headline, OrgData } from 'uniorg';
import { Note } from './models';

interface NoteNodeChunk {
  notes?: Note[];
  headings: string[];
}

const sectionHandler = (content: OrgData): NoteNodeChunk[] => {
  let chunks: NoteNodeChunk[] = [];
  content.children.forEach((c) => {
    // TODO: recursive collect chunks here
    const data = handlers[c.type]?.(c);
    if (!data) {
      return;
    }
    chunks = [...chunks, ...data];
  });
  return chunks;
};

const headlineHandler = (content: Headline): NoteNodeChunk[] => {
  return [
    {
      headings: [content.rawValue],
    },
  ];
};

type HandlerType = GreaterElementType & ElementType;

const handlers: { [key in HandlerType['type']]?: (data: GreaterElementType) => NoteNodeChunk[] } = {
  // 'property-drawer': parseProperties,
  section: sectionHandler,
  headline: headlineHandler,
};

export const collectNotes = (content: OrgData): Note[] => {
  const chunks = handlers['section'](content);

  // TODO: master real type
  const note: Note = chunks.reduce<any>(
    (acc, cn) => {
      if (!cn.headings) {
        return;
      }
      if (!acc.meta.headings) {
        acc.meta.headings = [];
      }
      acc.meta.headings = [...acc.meta.headings, ...cn.headings];
      return acc;
    },
    { meta: {} }
  );

  return [note];
};
