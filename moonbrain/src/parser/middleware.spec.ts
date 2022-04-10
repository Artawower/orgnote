import fs, { existsSync } from 'fs';
import path from 'path';
import { Link } from 'uniorg';
import { createLinkMiddleware } from './middleware';
import { v4 as uuid } from 'uuid';

describe('Link middleware', () => {
  let trashFilePath: string;

  afterEach(() => {
    if (trashFilePath && existsSync(trashFilePath)) {
      fs.unlinkSync(trashFilePath);
    }
    trashFilePath = null;
  });

  it('Should rename file with randome name', () => {
    fs.writeFileSync(path.join(__dirname, './test.jpg'), '');
    const orgLink: Link = {
      path: './test.jpg',
      rawLink: './test.jpg',
      type: 'link',
      linkType: 'file',
      format: 'plain',
      children: [],
    };
    const previousPath = orgLink.path;
    const newLink = createLinkMiddleware(__dirname)(orgLink) as Link;
    trashFilePath = path.join(__dirname, newLink.path);
    expect(newLink.path).not.toBe(previousPath);
    expect(newLink.rawLink).not.toBe(previousPath);
  });

  it('Should not rename file that already has uuid inside name', () => {
    const filePath = `./${uuid()}.png`;
    trashFilePath = path.join(__dirname, filePath);
    fs.writeFileSync(trashFilePath, '');

    const orgLink: Link = {
      path: filePath,
      rawLink: filePath,
      type: 'link',
      linkType: 'file',
      format: 'plain',
      children: [],
    };
    const newLink = createLinkMiddleware(__dirname)(orgLink) as Link;
    expect(newLink.path).toBe(filePath);
    expect(newLink.rawLink).toBe(filePath);
    expect(existsSync(path.join(__dirname, newLink.rawLink))).toBe(true);
  });
});
