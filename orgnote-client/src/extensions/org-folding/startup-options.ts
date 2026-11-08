import type { OrgNode } from 'org-mode-ast';
import { NodeType, walkTree } from 'org-mode-ast';

const STARTUP_OPTIONS = [
  'showeverything',
  'overview',
  'content',
  'showall',
  'show2levels',
  'show3levels',
  'show4levels',
  'show5levels',
] as const;

export type StartupOption = (typeof STARTUP_OPTIONS)[number];

const LEVEL_OPTIONS: Record<string, number> = {
  show2levels: 2,
  show3levels: 3,
  show4levels: 4,
  show5levels: 5,
};

export const parseStartupOption = (root: OrgNode): StartupOption | null => {
  const startup = root.meta?.startup as string | undefined;
  if (!startup) return null;

  const options = startup.toLowerCase().split(/\s+/);
  return options.find((opt): opt is StartupOption =>
    STARTUP_OPTIONS.includes(opt as StartupOption)
  ) ?? null;
};

export const getMaxVisibleLevel = (option: StartupOption): number | null => {
  if (option === 'showeverything' || option === 'showall') return null;
  if (option === 'overview') return 1;
  if (option === 'content') return Infinity;
  return LEVEL_OPTIONS[option] ?? null;
};

export interface HeadlineInfo {
  start: number;
  end: number;
  level: number;
  sectionStart: number;
  sectionEnd: number;
}

export const collectHeadlines = (root: OrgNode): HeadlineInfo[] => {
  const rawHeadlines: { start: number; level: number; sectionStart: number; nodeEnd: number }[] = [];

  walkTree(root, (node) => {
    if (node.isNot(NodeType.Headline)) return false;

    const section = node.section;
    if (!section) return false;

    rawHeadlines.push({
      start: node.start,
      level: node.level ?? 1,
      sectionStart: section.start,
      nodeEnd: node.end,
    });

    return false;
  });

  return rawHeadlines.map((h, idx) => {
    const nextSameLevelOrHigher = rawHeadlines
      .slice(idx + 1)
      .find((next) => next.level <= h.level);

    const sectionEnd = nextSameLevelOrHigher
      ? nextSameLevelOrHigher.start - 1
      : root.end;

    return {
      start: h.start,
      end: h.nodeEnd,
      level: h.level,
      sectionStart: h.sectionStart,
      sectionEnd,
    };
  });
};
