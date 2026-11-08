import { foldNodeProp } from '@codemirror/language';
import { NodeType } from 'org-mode-ast';

export const orgFoldProps = foldNodeProp.add({
  [NodeType.Headline]: (context) => {
    if (context.node.name !== NodeType.Headline) {
      return null;
    }
    const sectionChild = context.lastChild;
    if (!sectionChild) return null;

    const offset = context.node.nextSibling ? 1 : 0;
    return {
      from: sectionChild.from - 1,
      to: sectionChild.to - offset,
    };
  },
});
