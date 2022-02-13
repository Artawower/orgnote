import { parse } from 'uniorg-parse/lib/parser.js';
import { OrgData } from 'uniorg';
import toVFile from 'to-vfile';
import { Article, ArticleMeta } from './models';

const collectOrgNodes = (nodePath: string) => {};

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
  let active: boolean = false;
  let title: string;
  let description: string;
  const linkedArticles: string[] = [];

  if (!orgContent?.children) {
    return;
  }

  orgContent.children.forEach((c) => {
    if (c.type === 'property-drawer') {
      console.log(c.children);
    }
  });

  // TODO: every node could container another node
  return {
    id,
    meta: {
      headings,
      active,
      description,
      title,
      linkedArticles,
    },
  };
};

const makeOrgTreeFromFile = (filePath: string): Article => {
  const orgContent = readOrgFileContent(filePath);
  const { id, meta } = extractArticleMeta(orgContent);

  // const article: Article = {
  const article: any = {
    content: orgContent,
  };
  return article;
};

export { collectOrgNodes, makeOrgTreeFromFile };

makeOrgTreeFromFile('./miscellaneous/test1.org');
