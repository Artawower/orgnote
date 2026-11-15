import { getFileName } from 'orgnote-api';
import { getFileDirPath } from 'src/utils/get-file-dir-path';
import { formatOrgDate } from 'src/utils/org-date';

interface TemplateContext {
  path: string;
  fileName: string;
  directory: string;
  title: string;
  now: Date;
}

type TemplateHelperKind = 'value' | 'function';

type TemplateHelper = {
  kind: TemplateHelperKind;
  resolve: (context: TemplateContext) => string;
};

const TEMPLATE_EXPRESSION_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)(\(\))?\s*\}\}/g;

const padDatePart = (value: number): string => String(value).padStart(2, '0');

const formatIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const removeOrgExtension = (fileName: string): string => fileName.replace(/\.org(?:\.gpg)?$/, '');

const capitalizeWord = (word: string): string => {
  const first = word.at(0);
  if (!first) return word;
  return `${first.toUpperCase()}${word.slice(first.length)}`;
};

const humanizeTitle = (fileName: string): string =>
  removeOrgExtension(fileName)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(capitalizeWord)
    .join(' ');

const createTemplateContext = (path: string): TemplateContext => {
  const fileName = getFileName(path);
  return {
    path,
    fileName,
    directory: getFileDirPath(path),
    title: humanizeTitle(fileName),
    now: new Date(),
  };
};

const helpers: Record<string, TemplateHelper> = {
  title: { kind: 'value', resolve: (context) => context.title },
  path: { kind: 'value', resolve: (context) => context.path },
  fileName: { kind: 'value', resolve: (context) => context.fileName },
  directory: { kind: 'value', resolve: (context) => context.directory },
  uuid: { kind: 'function', resolve: () => crypto.randomUUID() },
  date: { kind: 'function', resolve: (context) => formatOrgDate(context.now) },
  isoDate: { kind: 'function', resolve: (context) => formatIsoDate(context.now) },
  timestamp: { kind: 'function', resolve: (context) => context.now.toISOString() },
};

const resolveExpression = (
  context: TemplateContext,
  name: string,
  isFunctionCall: boolean,
): string => {
  const helper = helpers[name];
  if (!helper) return '';
  if (helper.kind === 'function' !== isFunctionCall) return '';
  return helper.resolve(context);
};

export const renderOrgTemplate = (template: string, path: string): string => {
  const context = createTemplateContext(path);
  return template.replace(TEMPLATE_EXPRESSION_PATTERN, (_, name: string, call: string) =>
    resolveExpression(context, name, Boolean(call)),
  );
};
