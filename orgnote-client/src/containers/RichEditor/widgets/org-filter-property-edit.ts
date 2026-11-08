import { EditorState, Transaction } from '@codemirror/state';
import { NodeType, walkTree } from 'org-mode-ast';
import { orgNodeGetterFacet } from '../facets';
import { OrgMultilineWidget } from './org-multiline-widget';

export const readOnlyTransactionFilter = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !tr.annotation(Transaction.userEvent)) {
    return tr;
  }

  const orgNode = tr.state.facet(orgNodeGetterFacet)?.();
  if (!orgNode) return tr;

  let block = false;
  const blockedRange: [number?, number?] = [];

  walkTree(orgNode, (n): boolean => {
    const isProtectedPageDrawer = n.is(NodeType.PropertyDrawer) && n.parent?.is(NodeType.Root);
    if (!isProtectedPageDrawer || OrgMultilineWidget.hasRawEditRequest(n)) return false;
    blockedRange[0] = n.start;
    blockedRange[1] = n.end + 1;
    return true;
  });

  tr.changes.iterChangedRanges((chFrom, chTo) => {
    if (
      blockedRange[0] !== undefined &&
      blockedRange[1] !== undefined &&
      chFrom >= blockedRange[0] &&
      chTo <= blockedRange[1] &&
      chFrom !== chTo
    ) {
      block = true;
    }
  });

  return block ? [] : tr;
});
