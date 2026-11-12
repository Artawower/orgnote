import type { OrgNode } from 'org-mode-ast';

export const getKeywordName = (orgNode: OrgNode): string | null => {
  const prefix = orgNode.children?.first;
  if (!prefix?.value) return null;

  const value = prefix.value.toLowerCase();
  if (!value.startsWith('#+')) return null;

  const colonIndex = value.indexOf(':');
  if (colonIndex === -1) return null;

  return value.slice(2, colonIndex);
};

export const getKeywordMarker = (orgNode: OrgNode): string => {
  const prefix = orgNode.children?.first;
  if (!prefix?.value) return '';

  const colonIndex = prefix.value.indexOf(':');
  if (colonIndex === -1) return '';

  return prefix.value.slice(0, colonIndex + 1);
};

export const getKeywordValue = (orgNode: OrgNode): string => {
  const firstChild = orgNode.children?.first;
  if (!firstChild?.value) return '';

  const colonIndex = firstChild.value.indexOf(':');
  if (colonIndex === -1) return '';

  const afterColon = firstChild.value.slice(colonIndex + 1).trim();
  const children = orgNode.children;
  const tailValue = typeof children?.slice === 'function'
    ? children
      .slice(1)
      .map((child) => child.value ?? '')
      .join('')
    : '';

  return `${afterColon} ${tailValue}`.trim();
};