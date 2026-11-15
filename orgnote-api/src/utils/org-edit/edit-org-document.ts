import { parse } from 'org-mode-ast';
import { createOrgDocument } from './document';
import type { OrgDocument } from './types';

export const selectOrgDocument = <T>(
  content: string,
  select: (doc: OrgDocument) => T
): T => {
  const root = parse(content);
  return select(createOrgDocument(root));
};

export const editOrgDocument = (
  content: string,
  mutate: (doc: OrgDocument) => void
): string => {
  const root = parse(content);
  mutate(createOrgDocument(root));
  return root.rawValue;
};
