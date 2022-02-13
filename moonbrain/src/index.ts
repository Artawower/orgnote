import { parse } from 'uniorg-parse/lib/parser.js';
import { OrgData, GreaterElementType, ElementType, PropertyDrawer } from 'uniorg';
import toVFile from 'to-vfile';
import { Article, ArticleMeta, ArticleProperties } from './models';
import { normalizeOrgValue } from './tools';

const collectOrgNodes = (nodePath: string) => {};

const PROPERTY_ID = 'id';

const makeOrgTree = (orgContent: string): Article => {
  return null;
};

const readOrgFileContent = (filePath: string): OrgData => {
  const orgFile = toVFile.readSync(filePath);
  // TODO: handle "no such file or directory error"
  return parse(orgFile);
};

const extractArticleMeta = (orgContent: OrgData): { id: string; meta: ArticleMeta } => {
  let id: string;
  const headings: string[] = [];
  let title: string;
  let description: string;
  const properties: ArticleProperties = {};
  const linkedArticles: string[] = [];

  if (!orgContent?.children) {
    return;
  }

  // TODO: add custom enum type instead of string, so dirty
  const handlers: { [key in GreaterElementType['type']]?: (data: GreaterElementType) => void } = {
    // Main document properties
    'property-drawer': (c: PropertyDrawer) =>
      c.children.forEach((p) => {
        if (p.key.toLowerCase() === PROPERTY_ID) {
          id = p.value;
          return;
        }
        properties[p.key.toLowerCase()] = normalizeOrgValue(p.value);
      }),
  };

  orgContent.children.forEach((c) => {
    // TODO: don't check all nested fields when article hasn't id or inactive
    handlers[c.type]?.(c);
  });

  // TODO: every node could container nested node
  //  ...
  return {
    id,
    meta: {
      headings,
      description,
      title,
      linkedArticles,
      properties,
    },
  };
};

const makeOrgTreeFromFile = (filePath: string): Article => {
  const orgContent = readOrgFileContent(filePath);
  const { id, meta } = extractArticleMeta(orgContent);

  if (!id) {
    console.warn("Article doesn't container id! Its very necessary for zettelkasten");
    return;
  }

  // const article: Article = {
  const article: Article = {
    content: orgContent,
    id,
    meta,
  };
  return article;
};

const debugPrettyPrint = (o: OrgData) => {
  if (!o.children) {
    console.log(o);
    return;
  }
  o.children.forEach((c) => debugPrettyPrint(c));
};

export { collectOrgNodes, makeOrgTreeFromFile };

debugPrettyPrint(readOrgFileContent('./miscellaneous/test1.org'));

// console.log(makeOrgTreeFromFile('./miscellaneous/test1.org'));
