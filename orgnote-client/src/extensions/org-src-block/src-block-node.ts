import type { OrgNode } from 'org-mode-ast';

const SRC_BLOCK_CONTENT_INDEX = 2;
const SRC_BLOCK_LANGUAGE_PARTS_COUNT = 2;
const UNKNOWN_SRC_BLOCK_LANGUAGE = 'source code';

const getSrcBlockLanguageParts = (node: OrgNode) => {
  return node.children?.first?.children?.first?.children;
};

export const getSrcBlockCode = (node: OrgNode): string => {
  return node.children?.get(SRC_BLOCK_CONTENT_INDEX)?.rawValue ?? node.rawValue ?? '';
};

export const getSrcBlockLanguage = (node: OrgNode): string => {
  const languageParts = getSrcBlockLanguageParts(node);
  if (languageParts?.length !== SRC_BLOCK_LANGUAGE_PARTS_COUNT) {
    return UNKNOWN_SRC_BLOCK_LANGUAGE;
  }

  return languageParts.last.rawValue.trim();
};
