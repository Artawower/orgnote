import {
  Headline,
  Link,
  NodeProperty,
  OrgData,
  OrgNode,
  Section,
  Text,
  Keyword,
  GreaterElementType,
  ElementType,
} from 'uniorg';
import { NoteLink, Note, NoteHeading, NoteCategory } from './models.js';
import { isTrue, asArray, isFileImage } from './tools.js';

const FILETAGS_DEVIDER = ':';

export type NodeMiddleware = (orgData: OrgNode) => OrgNode;

interface NoteNodeChunk {
  notes?: Note[];
  headings?: NoteHeading[];
  title?: string;
  tags?: string[];
  description?: string;
  category?: NoteCategory;
  published?: boolean;
  externalLinks?: NoteLink[];
  internalLinks?: NoteLink[];
  images?: string[];
  id?: string;
}

const createSelectionHandler =
  (middleware: NodeMiddleware) =>
  (content: Section): [NoteNodeChunk[], OrgNode] => {
    const handleOrgNode = createNodeHandlers(middleware);
    const [chunks, nodes] = content.children.reduce<[NoteNodeChunk[], Array<GreaterElementType | ElementType>]>(
      ([chunks, previousNodes]: [NoteNodeChunk[], Array<GreaterElementType | ElementType>], content: OrgNode) => {
        const val = handleOrgNode(content);
        const [handledChunks, orgNode] = val;
        const newChunks = [...chunks, ...(handledChunks || [])];
        const newNodes = [...previousNodes, ...(orgNode ? [orgNode] : [])] as Array<GreaterElementType | ElementType>;
        return [newChunks, newNodes];
      },
      [[], []]
    );
    return [chunks, { ...content, children: nodes }];
  };

const headlineHandler = (content: Headline): [NoteNodeChunk, OrgNode] => [
  {
    headings: [{ text: content.rawValue, level: content.level }],
  },
  content,
];

const keywordHandlers: { [key: string]: (data: Keyword) => NoteNodeChunk } = {
  title: (content: Keyword) => ({ title: content.value }),
  filetags: (content: Keyword) => ({ tags: content.value.split(FILETAGS_DEVIDER).filter((v: string) => v) }),
  description: (content: Keyword) => ({ description: content.value }),
};

const keywordHandler = (content: Keyword): [NoteNodeChunk, OrgNode] => [
  keywordHandlers[content.key.toLocaleLowerCase()]?.(content),
  content,
];

const combineRawTextFromChildren = (children: Text[]) =>
  children.reduce((entireRawText, currentChildren) => `${entireRawText}${currentChildren.value}`, '');

const linkTypeCategory: { [key: string]: 'internalLinks' | 'externalLinks' | 'file' } = {
  id: 'internalLinks',
  https: 'externalLinks',
  http: 'externalLinks',
  file: 'file',
};

const linkHandler = (link: Link): [NoteNodeChunk, OrgNode] => {
  const linkType = linkTypeCategory[link.linkType];
  if (linkType === 'file' && isFileImage(link.path)) {
    return [{ images: [link.path] }, link];
  }
  if (linkType) {
    return [{ [linkType]: [{ name: combineRawTextFromChildren(link.children as Text[]), url: link.rawLink }] }, link];
  }
  return [null, link];
};

const propertiesHandlers: { [key: string]: (property: NodeProperty) => NoteNodeChunk } = {
  published: (property: NodeProperty) => ({ published: isTrue(property.value) }),
  id: (property: NodeProperty) => ({ id: property.value }),
  category: (property: NodeProperty) => ({ category: property.value as NoteCategory }),
};

const propertyHandler = (property: NodeProperty): [NoteNodeChunk, OrgNode] => [
  propertiesHandlers[property.key.toLocaleLowerCase()]?.(property),
  property,
];

const createNodeHandlers =
  (middleware?: NodeMiddleware): ((node: OrgNode) => [NoteNodeChunk[], OrgNode]) =>
  (node: OrgNode): [NoteNodeChunk[], OrgNode] => {
    // TODO: master doesn't see real type of returned function, change asArray method, or delete it
    const handlers: { [key in OrgNode['type']]?: (data: OrgNode) => [NoteNodeChunk[], OrgNode] } = {
      section: createSelectionHandler(middleware),
      'org-data': createSelectionHandler(middleware),
      headline: asArray<NoteNodeChunk>(headlineHandler),
      keyword: asArray<NoteNodeChunk>(keywordHandler),
      link: asArray<NoteNodeChunk>(linkHandler),
      paragraph: createSelectionHandler(middleware),
      'property-drawer': createSelectionHandler(middleware),
      'node-property': asArray<NoteNodeChunk>(propertyHandler),
    };
    const handler = handlers[node.type];
    const updatedNode = middleware?.(node) || node;
    return handler ? handler(updatedNode) : [[], updatedNode];
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
  const [chunks, patchedOrgNode] = handleOrgNode(content);

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
      acc.meta.category ??= cn.category;
      acc.meta.description ??= cn.description;
      acc.meta.published ??= cn.published;
      acc.meta.tags = [...acc.meta.tags, ...tags];
      acc.meta.externalLinks = [...acc.meta.externalLinks, ...externalLinks];
      acc.meta.linkedArticles = [...acc.meta.linkedArticles, ...internalLinks];
      acc.meta.images = [...acc.meta.images, ...cn.images];
      acc.id ??= cn.id;

      return acc;
    }, newEmptyNote()) as Note;

  note.content = patchedOrgNode as OrgData;
  return note;
};
