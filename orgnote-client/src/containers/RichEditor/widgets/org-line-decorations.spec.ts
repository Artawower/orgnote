import { test, expect, beforeEach, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { NodeType, parse, withMetaInfo } from 'org-mode-ast';
import type { OrgLineClasses } from 'orgnote-api';
import { orgNodeGetterFacet, lineClassesFacet } from '../facets';
import { orgLineDecoration } from './org-line-decorations';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

const createEditorView = (doc: string, lineClasses: OrgLineClasses): EditorView => {
  const orgNode = withMetaInfo(parse(doc));

  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        orgNodeGetterFacet.of(() => orgNode),
        lineClassesFacet.of(lineClasses),
        orgLineDecoration,
      ],
    }),
    parent: container,
  });
};

const getFirstLine = (view: EditorView): HTMLElement => {
  const line = view.dom.querySelector('.cm-line');
  if (!(line instanceof HTMLElement)) {
    throw new Error('Expected editor to render a line element');
  }

  return line;
};

test('orgLineDecoration applies line attributes to rendered line', () => {
  const view = createEditorView('* Heading', {
    [NodeType.Headline]: [
      {
        id: 'headline-line',
        class: 'org-headline-line',
        attributes: {
          style: '--org-list-depth: 2',
          'data-depth': '2',
        },
      },
    ],
  });

  const line = getFirstLine(view);

  expect(line.classList.contains('org-headline-line')).toBe(true);
  expect(line.getAttribute('style')).toContain('--org-list-depth: 2');
  expect(line.getAttribute('data-depth')).toBe('2');

  view.destroy();
});

test('orgLineDecoration merges classes and style attributes from multiple widgets', () => {
  const view = createEditorView('* Heading', {
    [NodeType.Headline]: [
      {
        id: 'headline-line-primary',
        class: 'org-headline-line',
        attributes: {
          style: '--org-list-depth: 2',
          'data-depth': '2',
        },
      },
      {
        id: 'headline-line-secondary',
        class: 'org-headline-accent',
        attributes: {
          style: 'color: red',
          'aria-label': 'heading',
        },
      },
    ],
  });

  const line = getFirstLine(view);
  const style = line.getAttribute('style') ?? '';

  expect(line.classList.contains('org-headline-line')).toBe(true);
  expect(line.classList.contains('org-headline-accent')).toBe(true);
  expect(style).toContain('--org-list-depth: 2');
  expect(style).toContain('color: red');
  expect(line.getAttribute('data-depth')).toBe('2');
  expect(line.getAttribute('aria-label')).toBe('heading');

  view.destroy();
});

test('orgLineDecoration normalizes trailing semicolons when merging style attributes', () => {
  const view = createEditorView('* Heading', {
    [NodeType.Headline]: [
      {
        id: 'headline-line-primary',
        class: 'org-headline-line',
        attributes: {
          style: '--org-list-depth: 2;',
        },
      },
      {
        id: 'headline-line-secondary',
        class: 'org-headline-accent',
        attributes: {
          style: 'color: red;',
        },
      },
    ],
  });

  const line = getFirstLine(view);
  const style = line.getAttribute('style') ?? '';

  expect(style).toContain('--org-list-depth: 2;');
  expect(style).toContain('color: red;');
  expect(style).not.toContain('; ;');

  view.destroy();
});
