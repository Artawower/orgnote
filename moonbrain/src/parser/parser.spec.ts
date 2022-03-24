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
*** 4
**** 5 level
***** 6 level
`);

describe('Parser tests', () => {
  it('Parser should collect headings', () => {
    const parsedNotes = collectNotes(parsedOrgDocument1);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.headings).toEqual(['Headline 1', 'Headline 2']);
  });

  it('Parser should collect nested headings', () => {
    const parsedNotes = collectNotes(parsedOrgDocument2);
    const firstNote = parsedNotes[0];
    expect(firstNote.meta.headings).toEqual(['A lot of', 'Nested', 'Fields', '4', '5 level', '6 level']);
  });
});
