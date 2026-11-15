import { test, expect, beforeEach, afterEach } from 'vitest';
import { useCodeEditorState } from './use-code-editor-state';
import { EditorView } from '@codemirror/view';

let container: HTMLDivElement;
let editorView: EditorView | undefined;

const createEditorViewGetter = () => () => editorView;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  editorView?.destroy();
  editorView = undefined;
  container.remove();
});

test('createState returns valid EditorState', () => {
  const { createState } = useCodeEditorState({
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  const state = createState('hello world');

  expect(state).toBeDefined();
  expect(state.doc.toString()).toBe('hello world');
});

test('createState with empty content', () => {
  const { createState } = useCodeEditorState({
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  const state = createState('');

  expect(state.doc.toString()).toBe('');
});

test('createState respects readonly option', () => {
  const { createState } = useCodeEditorState({
    readonly: true,
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  const state = createState('content');

  expect(state.readOnly).toBe(true);
});

test('createState with readonly false', () => {
  const { createState } = useCodeEditorState({
    readonly: false,
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  const state = createState('content');

  expect(state.readOnly).toBe(false);
});

test('createState with language option', () => {
  const { createState } = useCodeEditorState({
    language: 'typescript',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  const state = createState('const x = 1;');

  expect(state).toBeDefined();
});

test('createState with unknown language', () => {
  const { createState } = useCodeEditorState({
    language: 'unknownlang',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  const state = createState('content');

  expect(state).toBeDefined();
});

test('createState with isDark option', () => {
  const { createState } = useCodeEditorState({
    isDark: true,
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  const state = createState('content');

  expect(state).toBeDefined();
});

test('reconfigureReadonly changes readonly state', () => {
  const { createState, reconfigureReadonly } = useCodeEditorState({
    readonly: false,
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('content'),
    parent: container,
  });

  expect(editorView.state.readOnly).toBe(false);

  reconfigureReadonly(editorView, true);
  expect(editorView.state.readOnly).toBe(true);

  reconfigureReadonly(editorView, false);
  expect(editorView.state.readOnly).toBe(false);
});

test('reconfigureLanguage changes language', () => {
  const { createState, reconfigureLanguage } = useCodeEditorState({
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('content'),
    parent: container,
  });

  expect(() => reconfigureLanguage(editorView!, 'json')).not.toThrow();
  expect(() => reconfigureLanguage(editorView!, 'typescript')).not.toThrow();
  expect(() => reconfigureLanguage(editorView!, undefined)).not.toThrow();
});

test('reconfigureTheme changes theme', () => {
  const { createState, reconfigureTheme } = useCodeEditorState({
    isDark: false,
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('content'),
    parent: container,
  });

  expect(() => reconfigureTheme(editorView!, true)).not.toThrow();
  expect(() => reconfigureTheme(editorView!, false)).not.toThrow();
});

test('state includes line numbers extension', () => {
  const { createState } = useCodeEditorState({
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('line 1\nline 2'),
    parent: container,
  });

  const gutters = container.querySelector('.cm-gutters');
  expect(gutters).not.toBeNull();

  const lineNumbersEl = container.querySelector('.cm-lineNumbers');
  expect(lineNumbersEl).not.toBeNull();
});

test('state hides line numbers for markdown', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# hello\nworld'),
    parent: container,
  });

  expect(editorView).toBeDefined();
  const lineNumbersEl = container.querySelector('.cm-lineNumbers');
  expect(lineNumbersEl).toBeNull();
});

test('state hides line numbers for markdown alias', () => {
  const { createState } = useCodeEditorState({
    language: 'markdown',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# hello\nworld'),
    parent: container,
  });

  expect(editorView).toBeDefined();
  const lineNumbersEl = container.querySelector('.cm-lineNumbers');
  expect(lineNumbersEl).toBeNull();
});

test('markdown editor has markdown-view class', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# hello'),
    parent: container,
  });

  const editorEl = container.querySelector('.cm-editor.markdown-view');
  expect(editorEl).not.toBeNull();
});

test('markdown editor has markdown-content class on content', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# hello'),
    parent: container,
  });

  const contentEl = container.querySelector('.cm-content.markdown-content');
  expect(contentEl).not.toBeNull();
});

test('markdown editor hides fold gutter', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# hello\n## world'),
    parent: container,
  });

  const foldGutterEl = container.querySelector('.cm-foldGutter');
  expect(foldGutterEl).toBeNull();
});

test('non-markdown editor does not have markdown-view class', () => {
  const { createState } = useCodeEditorState({
    language: 'typescript',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('const x = 1;'),
    parent: container,
  });

  const editorEl = container.querySelector('.cm-editor.markdown-view');
  expect(editorEl).toBeNull();

  const lineNumbersEl = container.querySelector('.cm-lineNumbers');
  expect(lineNumbersEl).not.toBeNull();
});

test('reconfigureLanguage from ts to md switches to markdown mode', () => {
  const { createState, reconfigureLanguage } = useCodeEditorState({
    language: 'ts',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('const x = 1;'),
    parent: container,
  });

  expect(container.querySelector('.cm-editor.markdown-view')).toBeNull();
  expect(container.querySelector('.cm-lineNumbers')).not.toBeNull();
  expect(container.querySelector('.cm-foldGutter')).not.toBeNull();

  reconfigureLanguage(editorView, 'md');

  expect(container.querySelector('.cm-editor.markdown-view')).not.toBeNull();
  expect(container.querySelector('.cm-content.markdown-content')).not.toBeNull();
  expect(container.querySelector('.cm-lineNumbers')).toBeNull();
  expect(container.querySelector('.cm-foldGutter')).toBeNull();
});

test('reconfigureLanguage from md to ts switches to code mode', () => {
  const { createState, reconfigureLanguage } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# hello'),
    parent: container,
  });

  expect(container.querySelector('.cm-editor.markdown-view')).not.toBeNull();
  expect(container.querySelector('.cm-lineNumbers')).toBeNull();

  reconfigureLanguage(editorView, 'ts');

  expect(container.querySelector('.cm-editor.markdown-view')).toBeNull();
  expect(container.querySelector('.cm-content.markdown-content')).toBeNull();
  expect(container.querySelector('.cm-lineNumbers')).not.toBeNull();
  expect(container.querySelector('.cm-foldGutter')).not.toBeNull();
});

test('state includes fold gutter extension', () => {
  const { createState } = useCodeEditorState({
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('function test() {\n  return 1;\n}'),
    parent: container,
  });

  const foldGutter = container.querySelector('.cm-foldGutter');
  expect(foldGutter).not.toBeNull();
});

test('supported languages mapping works', () => {
  const languages = ['ts', 'js', 'json', 'toml', 'yaml', 'html', 'css', 'py', 'rs', 'go'];

  languages.forEach((lang) => {
    const { createState } = useCodeEditorState({
      language: lang,
      editorViewGetter: createEditorViewGetter(),
      onContentUpdate: () => {},
    });

    const state = createState('content');
    expect(state).toBeDefined();
  });
});

test('language aliases work correctly', () => {
  const aliases = [
    ['typescript', 'ts'],
    ['javascript', 'js'],
    ['python', 'py'],
    ['rust', 'rs'],
  ];

  aliases.forEach(([alias]) => {
    const { createState } = useCodeEditorState({
      language: alias,
      editorViewGetter: createEditorViewGetter(),
      onContentUpdate: () => {},
    });

    const state = createState('content');
    expect(state).toBeDefined();
  });
});

test('markdown heading lines get heading decoration classes', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# Heading 1\n## Heading 2\n### Heading 3\nNormal text'),
    parent: container,
  });

  const lines = container.querySelectorAll('.cm-line');
  expect(lines[0]!.classList.contains('markdown-heading-1')).toBe(true);
  expect(lines[0]!.classList.contains('markdown-heading-line')).toBe(true);
  expect(lines[1]!.classList.contains('markdown-heading-2')).toBe(true);
  expect(lines[1]!.classList.contains('markdown-heading-line')).toBe(true);
  expect(lines[2]!.classList.contains('markdown-heading-3')).toBe(true);
  expect(lines[3]!.classList.contains('markdown-heading-line')).toBe(false);
});

test('non-markdown editor does not get heading decoration classes', () => {
  const { createState } = useCodeEditorState({
    language: 'ts',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('const x = 1;'),
    parent: container,
  });

  const headingLines = container.querySelectorAll('.markdown-heading-line');
  expect(headingLines.length).toBe(0);
});

test('markdown link text gets markdown-link class', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('[label](https://example.com)'),
    parent: container,
  });

  const linkEl = container.querySelector('.markdown-link');
  expect(linkEl).not.toBeNull();
  expect(linkEl!.textContent).toContain('label');
});

test('non-markdown editor does not get markdown-link class', () => {
  const { createState } = useCodeEditorState({
    language: 'ts',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('const url = "https://example.com";'),
    parent: container,
  });

  const linkEl = container.querySelector('.markdown-link');
  expect(linkEl).toBeNull();
});

test('readonly markdown hides HeaderMark, EmphasisMark, LinkMark, CodeMark, URL', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    readonly: true,
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# heading\n**bold** *italic* [label](https://example.com) `code`'),
    parent: container,
  });

  const text = container.querySelector('.cm-content')!.textContent!;
  expect(text).not.toContain('#');
  expect(text).not.toContain('**');
  expect(text).not.toContain('[');
  expect(text).not.toContain('](');
  expect(text).not.toContain('`');
  expect(text).toContain('heading');
  expect(text).toContain('bold');
  expect(text).toContain('label');
  expect(text).toContain('code');
  expect(text).not.toContain('https://example.com');
});

test('editable markdown keeps markers visible', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    readonly: false,
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# heading\n**bold** [label](https://example.com)'),
    parent: container,
  });

  const text = container.querySelector('.cm-content')!.textContent!;
  expect(text).toContain('#');
  expect(text).toContain('**');
  expect(text).toContain('[');
  expect(text).toContain('https://example.com');
});

test('readonly non-markdown does not get readonly markdown decorations', () => {
  const { createState } = useCodeEditorState({
    language: 'ts',
    readonly: true,
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('const x = 1;'),
    parent: container,
  });

  const text = container.querySelector('.cm-content')!.textContent!;
  expect(text).toContain('const');
  expect(text).toContain('=');
});

test('markdown bold text gets markdown-strong class', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('normal **bold** text'),
    parent: container,
  });

  const strongEls = container.querySelectorAll('.markdown-strong');
  const boldContent = Array.from(strongEls).find(el => !el.classList.contains('markdown-marker'));
  expect(boldContent).toBeDefined();
  expect(boldContent!.textContent).toContain('bold');
});

test('markdown italic text gets markdown-emphasis class', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('normal *italic* text'),
    parent: container,
  });

  const emEls = container.querySelectorAll('.markdown-emphasis');
  const italicContent = Array.from(emEls).find(el => !el.classList.contains('markdown-marker'));
  expect(italicContent).toBeDefined();
  expect(italicContent!.textContent).toContain('italic');
});

test('markdown inline code gets markdown-code class', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('some `code` here'),
    parent: container,
  });

  const codeEl = container.querySelector('.markdown-code');
  expect(codeEl).not.toBeNull();
  expect(codeEl!.textContent).toContain('code');
});

test('non-markdown editor does not get markdown semantic classes', () => {
  const { createState } = useCodeEditorState({
    language: 'ts',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('const x = "bold";'),
    parent: container,
  });

  expect(container.querySelector('.markdown-strong')).toBeNull();
  expect(container.querySelector('.markdown-emphasis')).toBeNull();
  expect(container.querySelector('.markdown-heading-token')).toBeNull();
});


test('markdown markers receive markdown-marker class in edit mode', () => {
  const { createState } = useCodeEditorState({
    language: 'md',
    editorViewGetter: createEditorViewGetter(),
    onContentUpdate: () => {},
  });

  editorView = new EditorView({
    state: createState('# heading\n**bold** *italic* `code`'),
    parent: container,
  });

  const markers = container.querySelectorAll('.markdown-marker');
  const markerTexts = Array.from(markers).map(el => el.textContent);
  expect(markerTexts.some(t => t === '#')).toBe(true);
  expect(markerTexts.some(t => t === '**')).toBe(true);
  expect(markerTexts.some(t => t === '`')).toBe(true);
});
