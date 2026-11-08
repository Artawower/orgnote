import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getLogger } from '../logger.js';

const GITIGNORE_FILENAME = '.gitignore';

const isCommentOrEmpty = (line: string): boolean =>
  line.trim() === '' || line.trimStart().startsWith('#');

const isNegationPattern = (line: string): boolean =>
  line.trimStart().startsWith('!');

export const readGitignorePatterns = (rootFolder: string): string[] => {
  const gitignorePath = join(rootFolder, GITIGNORE_FILENAME);

  if (!existsSync(gitignorePath)) return [];

  const content = readFileSync(gitignorePath, 'utf8');
  const logger = getLogger();

  return content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => {
      if (isNegationPattern(line)) {
        logger.warn('Ignoring unsupported negation pattern in .gitignore: %s', line);
        return false;
      }
      return !isCommentOrEmpty(line);
    })
    .filter((line) => line.length > 0);
};
