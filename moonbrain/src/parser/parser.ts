import { Keyword } from 'orga';
import { ElementType, GreaterElementType, Headline, Link, NodeProperty, OrgData, Text } from 'uniorg';
import { NoteLink, Note, NoteHeading } from './models';
import { isTrue, asArray } from './tools';

const FILETAGS_DEVIDER = ':';

interface NoteNodeChunk {
  notes?: Note[];
  headings?: NoteHeading[];
  title?: string;
  tags?: string[];
  description?: string;
  active?: boolean;
  externalLinks?: NoteLink[];
  internalLinks?: NoteLink[];
  id?: string;
}

const sectionHandler = (content: OrgData): NoteNodeChunk[] =>
  content.children.reduce(
    (chunks: NoteNodeChunk[], content: OrgData) => [...chunks, ...(handlers[content.type]?.(content) || [])],
    []
  );

const headlineHandler = (content: Headline): NoteNodeChunk => ({
  headings: [{ text: content.rawValue, level: content.level }],
});

const keywordHandlers: { [key: string]: (data: Keyword) => NoteNodeChunk } = {
  title: (content: Keyword) => ({ title: content.value }),
  filetags: (content: Keyword) => ({ tags: content.value.split(FILETAGS_DEVIDER).filter((v: string) => v) }),
  description: (content: Keyword) => ({ description: content.value }),
};

const keywordHandler = (content: Keyword): NoteNodeChunk => keywordHandlers[content.key.toLocaleLowerCase()]?.(content);

const combineRawTextFromChildren = (children: Text[]) =>
  children.reduce((entireRawText, currentChildren) => `${entireRawText}${currentChildren.value}`, '');

const linkTypeCategody: { [key: string]: 'internalLinks' | 'externalLinks' } = {
  id: 'internalLinks',
  https: 'externalLinks',
  http: 'externalLinks',
};

const linkHandler = (link: Link): NoteNodeChunk => {
  const linkType = linkTypeCategody[link.linkType];
  if (linkType) {
    return { [linkType]: [{ name: combineRawTextFromChildren(link.children as Text[]), url: link.rawLink }] };
  }
};

const propertiesHandlers: { [key: string]: (property: NodeProperty) => NoteNodeChunk } = {
  active: (property: NodeProperty) => ({ active: isTrue(property.value) }),
  id: (property: NodeProperty) => ({ id: property.value }),
};

const propertyHandler = (property: NodeProperty): NoteNodeChunk =>
  propertiesHandlers[property.key.toLocaleLowerCase()]?.(property);

type HandlerType = GreaterElementType & ElementType;

const handlers: { [key in HandlerType['type']]?: (data: GreaterElementType) => NoteNodeChunk[] } = {
  section: sectionHandler,
  headline: asArray<NoteNodeChunk>(headlineHandler),
  keyword: asArray<NoteNodeChunk>(keywordHandler),
  link: asArray<NoteNodeChunk>(linkHandler),
  paragraph: sectionHandler,
  'property-drawer': sectionHandler,
  'node-property': asArray<NoteNodeChunk>(propertyHandler),
};

const newEmptyNote = (): Partial<Note> => {
  return {
    meta: {
      headings: [],
      tags: [],
      externalLinks: [],
      linkedArticles: [],
    },
  };
};

export const collectNote = (content: OrgData): Note => {
  const chunks: NoteNodeChunk[] = handlers['section'](content);
  const note = chunks
    .filter((cn: NoteNodeChunk) => !!cn)
    .reduce((acc: Note, cn: NoteNodeChunk) => {
      const headings = cn.headings ?? [];
      const tags = cn.tags ?? [];
      const externalLinks = cn.externalLinks ?? [];
      const internalLinks = cn.internalLinks ?? [];

      acc.meta.headings = [...acc.meta.headings, ...headings];
      acc.meta.title ??= cn.title;
      acc.meta.description ??= cn.description;
      acc.meta.active ??= cn.active;
      acc.meta.tags = [...acc.meta.tags, ...tags];
      acc.meta.externalLinks = [...acc.meta.externalLinks, ...externalLinks];
      acc.meta.linkedArticles = [...acc.meta.linkedArticles, ...internalLinks];
      acc.id ??= cn.id;

      return acc;
    }, newEmptyNote()) as Note;

  note.content = content;
  return note;
};
