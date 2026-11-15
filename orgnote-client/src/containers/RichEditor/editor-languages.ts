import type { Parser } from '@lezer/common';
import type { LanguageName } from '@uiw/codemirror-extensions-langs';
import { langs, loadLanguage } from '@uiw/codemirror-extensions-langs';
import { LanguageSupport } from '@codemirror/language';
import type { StreamLanguage } from '@codemirror/language';

const supportedLanguages: LanguageName[] = [
  'c',
  'clj',
  'lisp',
  'cpp',
  'css',
  'dart',
  'go',
  'java',
  'js',
  'json',
  'kt',
  'php',
  'py',
  'sass',
  'sql',
  'sh',
  'r',
  'toml',
  'rb',
  'rs',
  'html',
  'cs',
  'scala',
  'ts',
  'vue',
];

supportedLanguages.forEach((lang) => loadLanguage(lang));

const getParser = (
  lang: LanguageSupport | StreamLanguage<unknown>
): Parser => {
  if (lang instanceof LanguageSupport) {
    return lang.language.parser;
  }
  return lang.parser;
};

export const editorLanguages: Record<string, Parser> = {
  'web-mode': getParser(langs.vue()),
  java: getParser(langs.java()),
  'c++': getParser(langs.cpp()),
  c: getParser(langs.c()),
  cpp: getParser(langs.cpp()),
  rust: getParser(langs.rs()),
  rs: getParser(langs.rs()),
  javascript: getParser(langs.js()),
  js: getParser(langs.js()),
  typescript: getParser(langs.ts()),
  ts: getParser(langs.ts()),
  json: getParser(langs.json()),
  clojure: getParser(langs.clj()),
  clj: getParser(langs.clj()),
  'common-lisp': getParser(langs.lisp()),
  'emacs-lisp': getParser(langs.lisp()),
  lisp: getParser(langs.lisp()),
  css: getParser(langs.css()),
  dart: getParser(langs.dart()),
  go: getParser(langs.go()),
  html: getParser(langs.html()),
  kotlin: getParser(langs.kt()),
  kt: getParser(langs.kt()),
  sql: getParser(langs.sql()),
  mysql: getParser(langs.sql()),
  csharp: getParser(langs.cs()),
  cs: getParser(langs.cs()),
  r: getParser(langs.r()),
  ruby: getParser(langs.rb()),
  rb: getParser(langs.rb()),
  sass: getParser(langs.sass()),
  scss: getParser(langs.scss()),
  scala: getParser(langs.scala()),
  shell: getParser(langs.sh()),
  sh: getParser(langs.sh()),
  bash: getParser(langs.bash()),
  toml: getParser(langs.toml()),
  php: getParser(langs.php()),
  python: getParser(langs.py()),
  py: getParser(langs.py()),
  vue: getParser(langs.vue()),
  xml: getParser(langs.xml()),
  yaml: getParser(langs.yaml()),
  yml: getParser(langs.yml()),
  markdown: getParser(langs.md()),
  md: getParser(langs.md()),
};
