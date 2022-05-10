import { Note, NodeMiddleware } from './parser/index';
import { stringify } from 'uniorg-stringify/lib/stringify.js';
declare const collectNoteFromFile: (filePath: string, middlewareChains?: NodeMiddleware[]) => Note;
declare const collectNotesFromDir: (dir: string) => Note[];
declare const collectOrgNotesFromDir: (dir: string) => Note[];
export { collectNoteFromFile, collectNotesFromDir, stringify, collectOrgNotesFromDir };
