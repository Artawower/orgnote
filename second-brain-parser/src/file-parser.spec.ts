import { collectOrgNotesFromDir, collectNotesFromDir } from './index';
import { join } from 'path';

describe('File parser', () => {
  it('Should collect 3 note from files', () => {
    const notes = collectNotesFromDir(join(__dirname, '../miscellaneous'));
    expect(notes.length).toBe(3);
  });

  it('Should collect one active note with id and correct data', () => {
    const notes = collectOrgNotesFromDir(join(__dirname, '../miscellaneous'));
    expect(notes.length).toBe(2);
    const [note] = notes;
    expect(note.id).toBe('identifier qweqwe');
    expect(note.meta.description).toBe('This is description!');
    expect(note.meta.tags).toEqual(['tag1', 'tag2', 'tag3']);
    expect(note.meta.title).toEqual('Test article');
    expect(note.meta.category).toEqual('article');
  });
});
