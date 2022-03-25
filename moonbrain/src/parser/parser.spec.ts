import { parse } from 'uniorg-parse/lib/parser.js';

import { collectNotes } from './index';

const orgDocument1 = `
:PROPERTIES:
:ID: identifier qweqwe
:ACTIVE: true
:CATEGORY: article
:END:

#+TITLE: Test article
#+DESCRIPTION: This is description!
#+FILETAGS: :tag1:tag2:tag3:
#+STARTUP: show2levels
#+ACTIVE:


* Headline 1

Some text
** Headline 2
Another one text


*Bold text* - its a bold

+ list1
+ list2


- List 3
- list 4


#+BEGIN_QUOTE
Quote about life
and so on
#+END_QUOTE

| hello | amma | boy |
|   123 |  123 | qwe |



#+BEGIN_CENTER
Everything should be made as simple as possible, \\
but not any simpler
#+END_CENTER


#+BEGIN_SRC typescript
console.log('Hello world')
#+END_SRC
`;

const parsedOrgDocument1 = parse(orgDocument1);
const parsedOrgDocument2 = parse(`

* A lot of
** Nested
** Fields
*** 3
**** 4 level
***** 5 level
* Second level 1
`);

const parsedOrgDocumentWithoutHeading = parse(`

*Hello its me*
/and its a italic text/ and normal text and [[link][https://google.com]]`);

describe('Parser tests', () => {
  it('Parser should collect headings', () => {
    const parsedNotes = collectNotes(parsedOrgDocument1);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.headings).toEqual([
      { text: 'Headline 1', level: 1 },
      { text: 'Headline 2', level: 2 },
    ]);
  });

  it('Parser should collect nested headings', () => {
    const parsedNotes = collectNotes(parsedOrgDocument2);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.headings).toEqual([
      { text: 'A lot of', level: 1 },
      { text: 'Nested', level: 2 },
      { text: 'Fields', level: 2 },
      { text: '3', level: 3 },
      { text: '4 level', level: 4 },
      { text: '5 level', level: 5 },
      { text: 'Second level 1', level: 1 },
    ]);
  });

  it('Parser without heading should return empty list', () => {
    const parsedNotes = collectNotes(parsedOrgDocumentWithoutHeading);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.headings).toEqual([]);
  });

  it('Parser should extract correct title', () => {
    const parsedNotes = collectNotes(parsedOrgDocument1);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.title).toEqual('Test article');
  });

  it('Parser should not collect title from document without title', () => {
    const parsedNotes = collectNotes(parsedOrgDocument2);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.title).toBeUndefined();
  });

  it('Parser should collect only first title as the meta info', () => {
    const parsedNotes = collectNotes(
      parse(`
#+TITLE: Hey
#+DESCRIPTION: 123

* Some heading
** Another one

#+TITLE: second title
`)
    );
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.title).toEqual('Hey');
  });

  it('Parser should collect title that placed not at start of the document', () => {
    const parsedNotes = collectNotes(
      parse(`
      * Hello
      /I am a roam note/

      - List 3
      - list 4

      #+TITLE: MY NOTE 1.
  `)
    );
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.title).toEqual('MY NOTE 1.');
  });

  it('Parser should collect title that consist only from numbers', () => {
    const parsedNotes = collectNotes(parse(`#+TITLE: 123`));
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.title).toEqual('123');
  });

  it('Parser should collect tags', () => {
    const parsedNotes = collectNotes(parsedOrgDocument1);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('Parser should merge tags from different placements', () => {
    const parsedNotes = collectNotes(
      parse(`
#+FILETAGS: :tag1:tag2:
#+TITLE: Hellow

*Some text*

#+FILETAGS: :tag3:tag4:`)
    );
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4']);
  });

  it('Parser should collect tags with spaces', () => {
    const parsedNotes = collectNotes(parse('#+FILETAGS: :tag 1:tag 2 and spaces:tag 3:'));
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.tags).toEqual(['tag 1', 'tag 2 and spaces', 'tag 3']);
  });

  // TODO: master  add test for merge tags from multiline

  it('Parser should not collect tag in note without tags', () => {
    const parsedNotes = collectNotes(parsedOrgDocument2);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.tags).toEqual([]);
  });

  it('Parser should collect description', () => {
    const parsedNotes = collectNotes(parsedOrgDocument1);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.description).toEqual('This is description!');
  });

  it('Parser should collect description', () => {
    const parsedNotes = collectNotes(parsedOrgDocument2);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.description).toBeUndefined();
  });

  it('Parser should collect empty description field', () => {
    const parsedNotes = collectNotes(parse(`#+DESCRIPTION:`));
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.description).toEqual('');

    const parsedNotes2 = collectNotes(parse(`#+DESCRIPTION:`));
    const firstNote2 = parsedNotes2[0];
    expect(firstNote2.meta.description).toEqual('');
  });

  it('Parser should collect only first description as meta', () => {
    const parsedNotes = collectNotes(
      parse(`
#+TITLE: Hello world
#+DESCRIPTION: first description

*Heading

#+DESCRIPTION: second description
`)
    );
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.description).toEqual('first description');
  });
});
