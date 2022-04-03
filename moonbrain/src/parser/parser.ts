import { Keyword } from 'orga';
import { GreaterElementType, Headline, Link, NodeProperty, OrgData, OrgNode, Text } from 'uniorg';
import { NoteLink, Note, NoteHeading } from './models';
import { isTrue, asArray, isFileImage } from './tools';

const FILETAGS_DEVIDER = ':';

export type NodeMiddleware = (orgData: OrgNode) => OrgNode;

interface NoteNodeChunk {
  notes?: Note[];
  headings?: NoteHeading[];
  title?: string;
  tags?: string[];
  description?: string;
  active?: boolean;
  externalLinks?: NoteLink[];
  internalLinks?: NoteLink[];
  images?: string[];
  id?: string;
}

const createSelectionHandler =
  (middleware: NodeMiddleware) =>
  (content: OrgData): NoteNodeChunk[] => {
    const handleOrgNode = createNodeHandlers(middleware);
    return content.children.reduce(
      (chunks: NoteNodeChunk[], content: OrgData) => [...chunks, ...(handleOrgNode(content.type, content) || [])],
      []
    );
  };

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

const linkTypeCategody: { [key: string]: 'internalLinks' | 'externalLinks' | 'file' } = {
  id: 'internalLinks',
  https: 'externalLinks',
  http: 'externalLinks',
  file: 'file',
};

const linkHandler = (link: Link): NoteNodeChunk => {
  const linkType = linkTypeCategody[link.linkType];
  if (linkType === 'file' && isFileImage(link.path)) {
    return { images: [link.path] };
  }
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

const createNodeHandlers =
  (middleware?: NodeMiddleware): ((nodeType: OrgNode['type'], content: OrgData) => NoteNodeChunk[]) =>
  (nodeType: OrgNode['type'], content: OrgData): NoteNodeChunk[] => {
    const handlers: { [key in OrgNode['type']]?: (data: GreaterElementType) => NoteNodeChunk[] } = {
      section: createSelectionHandler(middleware),
      headline: asArray<NoteNodeChunk>(headlineHandler),
      keyword: asArray<NoteNodeChunk>(keywordHandler),
      link: asArray<NoteNodeChunk>(linkHandler),
      paragraph: createSelectionHandler(middleware),
      'property-drawer': createSelectionHandler(middleware),
      'node-property': asArray<NoteNodeChunk>(propertyHandler),
    };
    // TODO: master return new value instead of mutate existing object!
    middleware(content);
    return handlers[nodeType]?.(content);
  };

const newEmptyNote = (): Partial<Note> => {
  return {
    meta: {
      headings: [],
      tags: [],
      externalLinks: [],
      linkedArticles: [],
      images: [],
    },
  };
};

const buildMiddleware =
  (middlewareChains: NodeMiddleware[] = []) =>
  (orgNode: OrgNode) =>
    middlewareChains.reduce((orgNode, currentChain) => currentChain(orgNode), orgNode);

export const collectNote = (content: OrgData, middlewareChains: NodeMiddleware[] = []): Note => {
  const middleware = buildMiddleware(middlewareChains);

  const handleOrgNode = createNodeHandlers(middleware);
  const chunks: NoteNodeChunk[] = handleOrgNode('section', content);

  const note = chunks
    .filter((cn: NoteNodeChunk) => !!cn)
    .reduce((acc: Note, cn: NoteNodeChunk) => {
      const headings = cn.headings ?? [];
      const tags = cn.tags ?? [];
      const externalLinks = cn.externalLinks ?? [];
      const internalLinks = cn.internalLinks ?? [];
      cn.images ??= [];

      acc.meta.headings = [...acc.meta.headings, ...headings];
      acc.meta.title ??= cn.title;
      acc.meta.description ??= cn.description;
      acc.meta.active ??= cn.active;
      acc.meta.tags = [...acc.meta.tags, ...tags];
      acc.meta.externalLinks = [...acc.meta.externalLinks, ...externalLinks];
      acc.meta.linkedArticles = [...acc.meta.linkedArticles, ...internalLinks];
      acc.meta.images = [...acc.meta.images, ...cn.images];
      acc.id ??= cn.id;

      return acc;
    }, newEmptyNote()) as Note;

  note.content = content;
  return note;
};
