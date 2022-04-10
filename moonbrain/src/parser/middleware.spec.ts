import fs from 'fs';
import path from 'path';
import { Link } from 'uniorg';
import { createLinkMiddleware } from './middleware';

describe('Link middleware', () => {
  beforeAll(() => {
    fs.writeFileSync(path.join(__dirname, './test.jpg'), '');
  });

  it('Should rename file with randome name', () => {
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
    expect(newLink.path).not.toBe(previousPath);
    fs.unlinkSync(path.join(__dirname, newLink.path));
  });
});
