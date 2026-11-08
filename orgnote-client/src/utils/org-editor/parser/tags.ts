import { cmNodes } from './node-ids';
import type { Tag } from '@lezer/highlight';
import { Tag as TagClass, styleTags, tags as t } from '@lezer/highlight';
import { NodeType } from 'org-mode-ast';

const orgStyledNodes = [
  NodeType.Bold,
  NodeType.Italic,
  NodeType.Crossed,
  NodeType.Title,
  NodeType.PropertyDrawer,
  NodeType.SrcBlock,
  NodeType.Keyword,
  NodeType.Comment,
  NodeType.Operator,
  NodeType.BlockProperty,
  NodeType.SrcLanguage,
  NodeType.Link,
  NodeType.LinkName,
  NodeType.LinkUrl,
  NodeType.InlineCode,
  NodeType.Verbatim,
  NodeType.Checkbox,
  NodeType.QuoteBlock,
  NodeType.ListItem,
  ...cmNodes,
] as const;

type StyledNodes =
  | (typeof orgStyledNodes)[number]
  | 'Identifier'
  | 'Boolean'
  | 'String'
  | 'LineComment';

export const orgTags: Record<StyledNodes, Tag> = orgStyledNodes.reduce(
  (acc, cur) => ({ ...acc, [cur]: TagClass.define() }),
  {} as Record<StyledNodes, Tag>,
);

const defineNestedStyle = (styleName: string) => `${styleName}/...`;

const styleCodeLanguageNodes: Record<string, Tag> = {
  'Identifier/...': t.variableName,
  'Boolean/...': t.bool,
  'String/...': t.string,
  'LineComment/...': t.lineComment,
  'IfStatement/...': t.bool,
};

const buildOrgTagsStyles = (): Record<string, Tag> => {
  const result: Record<string, Tag> = { ...styleCodeLanguageNodes };
  for (const node of orgStyledNodes) {
    const tag = orgTags[node as StyledNodes];
    if (tag) {
      result[defineNestedStyle(node)] = tag;
    }
  }
  return result;
};

export const orgTagsStyles = styleTags(buildOrgTagsStyles());
