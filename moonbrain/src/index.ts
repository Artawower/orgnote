import { parse } from 'uniorg-parse/lib/parser.js';
import { OrgData } from 'uniorg';
import toVFile from 'to-vfile';

import { Note, collectNote } from './parser/index';
import { readdirSync, Dirent } from 'fs';
import { resolve } from 'path';
import { stringify } from 'uniorg-stringify/lib/stringify.js';

const readOrgFileContent = (filePath: string): OrgData => {
  const orgFile = toVFile.readSync(filePath);
  // TODO: handle "no such file or directory error"
  return parse(orgFile);
};

const collectNoteFromFile = (filePath: string): Note => {
  const orgContent = readOrgFileContent(filePath);
  const note = collectNote(orgContent);
  return note;
};

const debugPrettyPrint = (o: { children: any[] }, level: number = 0) => {
  console.log(' '.repeat(level), o);
  if (!o.children) {
    return;
  }
  o.children.forEach((c) => debugPrettyPrint(c, level + 2));
};

const collectNotesFromDir = (dir: string): Note[] => {
  const files = readdirSync(dir, { withFileTypes: true });
  const notes = files.reduce((notes: Note[], dirent: Dirent) => {
    console.log('🦄: [line 31][index.ts] [35mfile: ', dirent.name);
    console.log('-------');
    const isDir = dirent.isDirectory();
    const fileName = resolve(dir, dirent.name);
    return [...notes, ...(isDir ? collectNotesFromDir(fileName) : [collectNoteFromFile(fileName)])];
  }, []);

  return notes;
};

export { collectNoteFromFile, collectNotesFromDir };

const note = collectNoteFromFile('./miscellaneous/test1.org');

// console.log(stringify(note.content));
debugPrettyPrint(readOrgFileContent('./miscellaneous/test1.org'));
// debugPrettyPrint(readOrgFileContent('./miscellaneous/test2.org'));
//
// console.log(readOrgFileContent('./miscellaneous/test1.org'));
// console.log(collectNotesFromDir('/Volumes/DARK SIDE/projects/pet/roam/moonbrain/miscellaneous'));
// console.log(JSON.stringify(collectNotesFromFile('./miscellaneous/test1.org'), null, 2));
// console.log(makeOrgTreeFromFile('./miscellaneous/test1.org'));

// console.log('🦄: [line 63][index.ts<2>] [35mstringify: ', stringify(note.content));
