import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  indentOnInput,
  foldGutter,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';
import { loadLanguage, type LanguageName } from '@uiw/codemirror-extensions-langs';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import {
  isMarkdownLanguage,
  getMarkdownModeExtensions,
  getMarkdownReadonlyExtensions,
} from './markdown-mode';

export interface UseCodeEditorStateOptions {
  readonly?: boolean;
  language?: string;
  isDark?: boolean;
  readonlyGetter?: () => boolean;
  languageGetter?: () => string | undefined;
  isDarkGetter?: () => boolean | undefined;
  editorViewGetter: () => EditorView | undefined;
  onContentUpdate: (content: string) => void;
}

const LANGUAGE_MAP: Record<string, LanguageName> = {
  ts: 'ts',
  typescript: 'ts',
  js: 'js',
  javascript: 'js',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  toml: 'toml',
  yaml: 'yaml',
  yml: 'yaml',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  py: 'py',
  python: 'py',
  rs: 'rs',
  rust: 'rs',
  go: 'go',
  java: 'java',
  kt: 'kt',
  kotlin: 'kt',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cs: 'cs',
  csharp: 'cs',
  rb: 'rb',
  ruby: 'rb',
  php: 'php',
  sql: 'sql',
  sh: 'sh',
  bash: 'bash',
  shell: 'sh',
  vue: 'vue',
  xml: 'xml',
  md: 'md',
  markdown: 'md',
};

const getLanguageExtension = (language?: string): Extension[] => {
  if (!language) return [];

  const langName = LANGUAGE_MAP[language.toLowerCase()];
  if (!langName) return [];

  const langSupport = loadLanguage(langName);
  return langSupport ? [langSupport] : [];
};

const getThemeExtension = (isDark?: boolean): Extension => (isDark ? githubDark : githubLight);

const getEditorModeExtensions = (language?: string): Extension[] => {
  if (isMarkdownLanguage(language)) return getMarkdownModeExtensions();
  return [lineNumbers(), foldGutter(), highlightActiveLine(), bracketMatching(), closeBrackets()];
};

const getReadonlyModeExtensions = (language?: string, readonly?: boolean): Extension[] => {
  if (!isMarkdownLanguage(language) || !readonly) return [];
  return getMarkdownReadonlyExtensions();
};

const createBaseExtensions = (editorViewGetter: () => EditorView | undefined): Extension[] => [
  history(),
  highlightSelectionMatches(),
  indentOnInput(),
  autocompletion(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  EditorView.lineWrapping,
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    ...searchKeymap,
    indentWithTab,
    {
      key: 'Escape',
      run: () => {
        editorViewGetter()?.contentDOM.blur();
        return false;
      },
    },
  ]),
];

const createUpdateListener = (onUpdate: (content: string) => void): Extension =>
  EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    onUpdate(update.state.doc.toString());
  });

export const useCodeEditorState = (options: UseCodeEditorStateOptions) => {
  const compartments = {
    readonly: new Compartment(),
    language: new Compartment(),
    theme: new Compartment(),
    editorMode: new Compartment(),
    readonlyMode: new Compartment(),
  };

  const getReadonly = (): boolean => options.readonlyGetter?.() ?? options.readonly ?? false;
  const getLanguage = (): string | undefined => options.languageGetter?.() ?? options.language;
  const getIsDark = (): boolean | undefined => options.isDarkGetter?.() ?? options.isDark;

  const createState = (content: string): EditorState => {
    const readonly = getReadonly();
    const language = getLanguage();

    return EditorState.create({
      doc: content,
      extensions: [
        ...createBaseExtensions(options.editorViewGetter),
        createUpdateListener(options.onContentUpdate),
        compartments.readonly.of(EditorState.readOnly.of(readonly)),
        compartments.language.of(getLanguageExtension(language)),
        compartments.theme.of(getThemeExtension(getIsDark())),
        compartments.editorMode.of(getEditorModeExtensions(language)),
        compartments.readonlyMode.of(getReadonlyModeExtensions(language, readonly)),
      ],
    });
  };

  const reconfigureReadonly = (view: EditorView, value: boolean): void => {
    const language = getLanguage();
    view.dispatch({
      effects: [
        compartments.readonly.reconfigure(EditorState.readOnly.of(value)),
        compartments.readonlyMode.reconfigure(getReadonlyModeExtensions(language, value)),
      ],
    });
  };

  const reconfigureLanguage = (view: EditorView, language?: string): void => {
    view.dispatch({
      effects: [
        compartments.language.reconfigure(getLanguageExtension(language)),
        compartments.editorMode.reconfigure(getEditorModeExtensions(language)),
        compartments.readonlyMode.reconfigure(
          getReadonlyModeExtensions(language, view.state.readOnly),
        ),
      ],
    });
  };

  const reconfigureTheme = (view: EditorView, isDark?: boolean): void => {
    view.dispatch({
      effects: compartments.theme.reconfigure(getThemeExtension(isDark)),
    });
  };

  return {
    createState,
    reconfigureReadonly,
    reconfigureLanguage,
    reconfigureTheme,
  };
};
