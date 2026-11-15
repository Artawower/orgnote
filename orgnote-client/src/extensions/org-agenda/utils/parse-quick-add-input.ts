import { fileBaseName } from 'src/utils/file-path';

const TILDE_PATTERN = /~([^\s]+)/g;

export interface ParsedQuickAdd {
  title: string;
  body?: string;
  targetFile?: string;
}

const splitLines = (raw: string): [string, string | undefined] => {
  const idx = raw.indexOf('\n');
  if (idx === -1) return [raw, undefined];
  const body = raw.slice(idx + 1).trim();
  return [raw.slice(0, idx), body || undefined];
};

const findMatchingFile = (token: string, knownFiles: string[]): string | undefined =>
  knownFiles.find((f) => fileBaseName(f).toLowerCase() === token.toLowerCase());

const resolveTildeMatches = (
  titleLine: string,
  knownFiles: string[],
): { title: string; targetFile?: string } => {
  let targetFile: string | undefined;
  const title = titleLine.replace(TILDE_PATTERN, (match, token: string) => {
    if (targetFile) return match;
    const found = findMatchingFile(token, knownFiles);
    if (!found) return match;
    targetFile = found;
    return '';
  });
  return { title: title.trim().replace(/\s{2,}/g, ' '), targetFile };
};

export const parseQuickAddInput = (raw: string, knownFiles: string[]): ParsedQuickAdd => {
  const [titleLine, body] = splitLines(raw);
  const { title, targetFile } = resolveTildeMatches(titleLine, knownFiles);
  return {
    title,
    ...(body ? { body } : {}),
    ...(targetFile ? { targetFile } : {}),
  };
};
