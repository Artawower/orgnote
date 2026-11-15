import { indentNodeProp } from '@codemirror/language';
import { NodeType } from 'org-mode-ast';

export const orgIndentProps = indentNodeProp.add({
  [NodeType.Section]: (context) => {
    if (context.node.parent?.name === NodeType.ListItem) {
      return 2;
    }
    return 0;
  },
});
