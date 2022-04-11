import { collectNotesFromDir } from './index';
import { join } from 'path';

describe('File parser', () => {
  it('Should collect 3 note from files', () => {
    const notes = collectNotesFromDir(join(__dirname, '../miscellaneous'));
    expect(notes.length).toBe(3);
  });
});
