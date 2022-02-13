import { parse } from 'uniorg-parse/lib/parser.js';
import { toVFile } from 'to-vfile';
import { Article } from './models';

const orgFile = toVFile.readSync('./miscellaneous/test1.org');
// console.log('🦄: [line 10][index.ts] orgFile: ', orgFile);

const collectOrgNodes = (nodePath: string) => {};

const makeOrgTree = (orgContent: string): Article => {
  return nil;
};

export { collectOrgNodes };

const parsed;
console.log(parse(orgFile));

console.log('Amma new techonolgy!');
