import { parse } from 'uniorg-parse/lib/parser.js';
import { OrgData } from 'uniorg';
import toVFile from 'to-vfile';

import { Note, collectNote, NodeMiddleware, isOrgFile, createLinkMiddleware } from './parser/index.js';
import { readdirSync, Dirent, existsSync } from 'fs';
import { join, resolve } from 'path';
import { stringify } from 'uniorg-stringify/lib/stringify.js';

const readOrgFileContent = (filePath: string): OrgData => {
  const orgFile = toVFile.readSync(filePath);
  // TODO: handle "no such file or directory error"
  return parse(orgFile);
};

const collectNoteFromFile = (filePath: string, middlewareChains?: NodeMiddleware[]): Note => {
  const isFileExist = existsSync(filePath);
  if (!isFileExist) {
    return null;
  }
  const orgContent = readOrgFileContent(filePath);
  const note = collectNote(orgContent, middlewareChains);
  return note;
};

/*
 * Internal function for pretty printing the org content as nested tree
 */
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
    const isDir = dirent.isDirectory();
    const fileName = resolve(dir, dirent.name);
    const middlewares = [createLinkMiddleware(dir)];

    if (!isOrgFile(fileName)) {
      return notes;
    }

    if (isDir) {
      return [...notes, ...collectNotesFromDir(fileName)];
    }

    const collectedNote = collectNoteFromFile(fileName, middlewares);
    if (collectedNote) {
      return [...notes, collectedNote];
    }
    return notes;
  }, []);

  return notes;
};

const collectOrgNotesFromDir = (dir: string): Note[] => {
  const notes = collectNotesFromDir(dir);
  return notes.filter((n) => n.id);
};

export { collectNoteFromFile, collectNotesFromDir, stringify, collectOrgNotesFromDir, createLinkMiddleware };

// const note = collectNoteFromFile('./miscellaneous/test1.org');

// console.log(stringify(note.content));
// debugPrettyPrint(readOrgFileContent('./miscellaneous/test1.org'));
// debugPrettyPrint(readOrgFileContent('./miscellaneous/test2.org'));
//
// console.log(readOrgFileContent('./miscellaneous/test1.org'));
// console.log(collectNotesFromDir('/Volumes/DARK SIDE/projects/pet/roam/moonbrain/miscellaneous'));
// console.log(JSON.stringify(collectNotesFromFile('./miscellaneous/test1.org'), null, 2));
// console.log(makeOrgTreeFromFile('./miscellaneous/test1.org'));

// console.log('🦄: [line 63][index.ts<2>] [35mstringify: ', stringify(note.content));

// TODO: master This logic should be moved to external npm package
// const notes = collectNotesFromDir(join(resolve(), 'miscellaneous'));
// console.log(notes);
