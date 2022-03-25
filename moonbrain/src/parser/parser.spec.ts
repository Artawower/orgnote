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
});
