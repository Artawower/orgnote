import { parse } from 'uniorg-parse/lib/parser.js';
import { ElementType, GreaterElementType, OrgData } from 'uniorg';
import toVFile from 'to-vfile';
import { Note, collectNotes, extractArticleMeta } from './parser/index';

const collectOrgNodes = (nodePath: string) => {};

const makeOrgTree = (orgContent: string): Note => {
  return null;
};

const readOrgFileContent = (filePath: string): OrgData => {
  const orgFile = toVFile.readSync(filePath);
  // TODO: handle "no such file or directory error"
  return parse(orgFile);
};

const collectNotesFromFile = (filePath: string): Note[] => {
  const orgContent = readOrgFileContent(filePath);
  const notes = collectNotes(orgContent);

  return notes;
};

// TODO: type it
const debugPrettyPrint = (o: { children: any[] }, level: number = 0) => {
  console.log(' '.repeat(level), o);
  if (!o.children) {
    return;
  }
  o.children.forEach((c) => debugPrettyPrint(c, level + 2));
};

export { collectOrgNodes, collectNotesFromFile };

debugPrettyPrint(readOrgFileContent('./miscellaneous/test1.org'));
// console.log(readOrgFileContent('./miscellaneous/test1.org'));
console.log('-------');

// console.log(JSON.stringify(collectNotesFromFile('./miscellaneous/test1.org'), null, 2));
// console.log(makeOrgTreeFromFile('./miscellaneous/test1.org'));
