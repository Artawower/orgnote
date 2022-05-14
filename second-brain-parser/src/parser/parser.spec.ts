import { Link, OrgNode, Paragraph } from "uniorg";
import { parse } from "uniorg-parse/lib/parser.js";

import { collectNote } from "./index";

const orgDocument1 = `
:PROPERTIES:
:ID: identifier qweqwe
:PUBLISHED:
:CATEGORY: article
:END:

#+TITLE: Test article
#+DESCRIPTION: This is description!
#+FILETAGS: :tag1:tag2:tag3:
#+STARTUP: show2levels


* Headline 1

Some text
** Headline 2
 [[https://google.com][Its a link]]
Another one text


 [[https://du-blog.ru][another link]]
[[./test.jpeg]]

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

:PROPERTIES:
:PUBLISHED: true
:END:

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

describe("Parser tests", () => {
  it("Parser should collect headings", () => {
    const [note, _] = collectNote(parsedOrgDocument1);

    expect(note.meta.headings).toEqual([
      { text: "Headline 1", level: 1 },
      { text: "Headline 2", level: 2 },
    ]);
  });

  it("Parser should collect nested headings", () => {
    const [note, _] = collectNote(parsedOrgDocument2);

    expect(note.meta.headings).toEqual([
      { text: "A lot of", level: 1 },
      { text: "Nested", level: 2 },
      { text: "Fields", level: 2 },
      { text: "3", level: 3 },
      { text: "4 level", level: 4 },
      { text: "5 level", level: 5 },
      { text: "Second level 1", level: 1 },
    ]);
  });

  it("Parser without heading should return empty list", () => {
    const [note, _] = collectNote(parsedOrgDocumentWithoutHeading);

    expect(note.meta.headings).toEqual([]);
  });

  it("Parser should extract correct title", () => {
    const [note, _] = collectNote(parsedOrgDocument1);

    expect(note.meta.title).toEqual("Test article");
  });

  it("Parser should not collect title from document without title", () => {
    const [note, _] = collectNote(parsedOrgDocument2);

    expect(note.meta.title).toBeUndefined();
  });

  it("Parser should collect only first title as the meta info", () => {
    const [note, _] = collectNote(
      parse(`
#+TITLE: Hey
#+DESCRIPTION: 123

* Some heading
** Another one

#+TITLE: second title
`)
    );

    expect(note.meta.title).toEqual("Hey");
  });

  it("Parser should collect title that placed not at start of the document", () => {
    const [note, _] = collectNote(
      parse(`
      * Hello
      /I am a roam note/

      - List 3
      - list 4

      #+TITLE: MY NOTE 1.
  `)
    );

    expect(note.meta.title).toEqual("MY NOTE 1.");
  });

  it("Parser should collect title that consist only from numbers", () => {
    const [note, _] = collectNote(parse(`#+TITLE: 123`));

    expect(note.meta.title).toEqual("123");
  });

  it("Parser should collect tags", () => {
    const [note, _] = collectNote(parsedOrgDocument1);

    expect(note.meta.tags).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("Parser should merge tags from different placements", () => {
    const [note, _] = collectNote(
      parse(`
#+FILETAGS: :tag1:tag2:
#+TITLE: Hellow

*Some text*

#+FILETAGS: :tag3:tag4:`)
    );

    expect(note.meta.tags).toEqual(["tag1", "tag2", "tag3", "tag4"]);
  });

  it("Parser should collect tags with spaces", () => {
    const [note, _] = collectNote(
      parse("#+FILETAGS: :tag 1:tag 2 and spaces:tag 3:")
    );

    expect(note.meta.tags).toEqual(["tag 1", "tag 2 and spaces", "tag 3"]);
  });

  // TODO: master  add test for merge tags from multiline

  it("Parser should not collect tag in note without tags", () => {
    const [note, _] = collectNote(parsedOrgDocument2);

    expect(note.meta.tags).toEqual([]);
  });

  it("Parser should collect description", () => {
    const [note, _] = collectNote(parsedOrgDocument1);

    expect(note.meta.description).toEqual("This is description!");
  });

  it("Parser should collect description", () => {
    const [note, _] = collectNote(parsedOrgDocument2);

    expect(note.meta.description).toBeUndefined();
  });

  it("Parser should collect empty description field", () => {
    const [note, _] = collectNote(parse(`#+DESCRIPTION:`));

    expect(note.meta.description).toEqual("");

    const [note2, _1] = collectNote(parse(`#+DESCRIPTION:`));
    expect(note2.meta.description).toEqual("");
  });

  it("Parser should collect only first description as meta", () => {
    const [note, _] = collectNote(
      parse(`
#+TITLE: Hello world
#+DESCRIPTION: first description

*Heading

#+DESCRIPTION: second description
`)
    );

    expect(note.meta.description).toEqual("first description");
  });

  it("Parser shound not recognize the note as published", () => {
    const [note, _] = collectNote(parsedOrgDocument1);

    expect(note.meta.published).toEqual(false);
  });

  it("Parser shound recognize the note as published", () => {
    const [note, _] = collectNote(parsedOrgDocument2);

    expect(note.meta.published).toEqual(true);
  });

  it("Parser shound not recognize the note as published with random content", () => {
    const [note, _] = collectNote(
      parse(`
:PROPERTIES:
:PUBLISHED: blabla
:END:`)
    );

    expect(note.meta.published).toEqual(false);
  });

  it("Parser shound not recognize the note as published with empty string", () => {
    const [note, _] = collectNote(
      parse(`
:PROPERTIES:
:PUBLISHED:
:END:`)
    );

    expect(note.meta.published).toEqual(false);
  });

  it("Parser shound recognize the note as published with yes keyword", () => {
    const [note, _] = collectNote(
      parse(`
:PROPERTIES:
:PUBLISHED: yes
:END:`)
    );

    expect(note.meta.published).toEqual(true);
  });

  it("Parser should collect all external links from document", () => {
    const [note, _] = collectNote(parsedOrgDocument1);
    expect(note.meta.externalLinks).toEqual([
      { name: "Its a link", url: "https://google.com" },
      { name: "another link", url: "https://du-blog.ru" },
    ]);
  });

  it("Parser should not collect internal link", () => {
    const [note, _] = collectNote(
      parse(`
 [[https://google.com][Its a link]]
Another one text

 [[https://du-blog.ru][another link]]
[[id:elisp][Elisp]]
`)
    );

    expect(note.meta.externalLinks).toEqual([
      { name: "Its a link", url: "https://google.com" },
      { name: "another link", url: "https://du-blog.ru" },
    ]);
  });

  it("Parser should collect only internal link", () => {
    const [note, _] = collectNote(
      parse(`
 [[https://google.com][Its a link]]
Another one text

 [[https://du-blog.ru][another link]]
[[id:elisp][Elisp]]

[[./test.jpeg]]
`)
    );

    expect(note.meta.linkedArticles).toEqual([
      { name: "Elisp", url: "id:elisp" },
    ]);
  });

  it("Parser should container empty links lists", () => {
    const [note, _] = collectNote(parsedOrgDocument2);

    expect(note.meta.linkedArticles).toEqual([]);
  });

  it("Parser should collect id", () => {
    const [note, _] = collectNote(parsedOrgDocument1);
    expect(note.id).toEqual("identifier qweqwe");
  });

  it("Parser should collect correct images", () => {
    const [note, _] = collectNote(parsedOrgDocument1);
    expect(note.meta.images).toEqual(["test.jpeg"]);
    expect(note.meta.images.length).toEqual(1);
  });

  it("Parser should not collect images", () => {
    const [note, _] = collectNote(parsedOrgDocument2);
    expect(note.meta.images).toEqual([]);
  });

  it("Parser should call middleware", () => {
    let middlewareCalled = false;
    const middlewares = [
      (n: OrgNode) => {
        middlewareCalled = true;
        return n;
      },
    ];
    collectNote(parsedOrgDocument2, middlewares);
    expect(middlewareCalled).toEqual(true);
    // TODO: master  call middleware
  });

  // TODO: master fix test
  it("Parser should update node by middleware", () => {
    const middlewares = [
      (n: OrgNode) => {
        if (n.type === "link" && n.linkType === "file" && n.path) {
          n.path = "./new-path.jpg";
          n.rawLink = "./new-path.jpg";
        }
        return n;
      },
    ];

    const [note, _] = collectNote(
      parse(`
#+TITLE: Some note with image, and this image should be renamed by middleware and change positions of next blocks
[[./test.jpeg][test]]

* Some title
** Nested title
`),
      middlewares
    );

    const link = (note.content.children[1] as Paragraph).children[0] as Link;
    expect(link.path).toEqual("./new-path.jpg");
    expect(link.rawLink).toEqual("./new-path.jpg");
  });
});
