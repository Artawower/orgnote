import type { OrgNode } from 'org-mode-ast';
import { NodeType, OrgNode as OrgNodeCtor, parse } from 'org-mode-ast';
import type { OrgHeadline } from '../types';
import { createPlanningSlot } from './planning';
import { createLogbook } from './logbook';
import { createProperties } from './properties';
import { detachNode } from '../shared/detach-node';

const TITLE_PREFIX_TYPES = new Set<NodeType>([
  NodeType.Operator,
  NodeType.TodoKeyword,
  NodeType.Priority,
]);
const TITLE_SUFFIX_TYPES = new Set<NodeType>([
  NodeType.TagList,
  NodeType.NewLine,
]);
const NON_BODY_TYPES = new Set<NodeType>([
  NodeType.Planning,
  NodeType.PropertyDrawer,
  NodeType.Property,
  NodeType.PlanningKeyword,
  NodeType.Date,
  NodeType.DateRange,
  NodeType.Indent,
]);

const findTodoKeywordNode = (headline: OrgNode): OrgNode | undefined =>
  headline.title?.childrenList.find((n) => n.is(NodeType.TodoKeyword));

const buildTextNode = (value: string): OrgNode =>
  new OrgNodeCtor({ type: NodeType.Text, value, start: 0, end: value.length });

const findLastIndex = <T>(
  items: readonly T[],
  pred: (item: T, index: number) => boolean
): number => {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (pred(items[i]!, i)) return i;
  }
  return -1;
};

interface TitleTextSpan {
  startIdx: number;
  endIdx: number;
  hasKeywordOrPriority: boolean;
  hasTagSuffix: boolean;
}

const getTitleTextSpan = (title: OrgNode): TitleTextSpan => {
  const children = title.childrenList;
  const lastPrefixIdx = findLastIndex(children, (c) =>
    TITLE_PREFIX_TYPES.has(c.type)
  );
  const firstSuffixIdx = children.findIndex((c) =>
    TITLE_SUFFIX_TYPES.has(c.type)
  );
  return {
    startIdx: lastPrefixIdx + 1,
    endIdx: firstSuffixIdx === -1 ? children.length : firstSuffixIdx,
    hasKeywordOrPriority: lastPrefixIdx > 0,
    hasTagSuffix:
      firstSuffixIdx !== -1 && !!children[firstSuffixIdx]?.is(NodeType.TagList),
  };
};

const getBodyStartIdx = (section: OrgNode): number => {
  const children = section.childrenList;
  return (
    findLastIndex(children, (node, i) => {
      if (NON_BODY_TYPES.has(node.type)) return true;
      const previous = children[i - 1];
      return (
        node.is(NodeType.NewLine) &&
        !!previous &&
        NON_BODY_TYPES.has(previous.type)
      );
    }) + 1
  );
};

const replaceTitleTextSpan = (headline: OrgNode, newText: string): void => {
  const title = headline.title;
  if (!title) {
    throw new Error('OrgHeadline.setTitle: headline has no title node');
  }
  const span = getTitleTextSpan(title);
  const childrenSnapshot = title.childrenList.slice();

  const toRemove = childrenSnapshot.slice(span.startIdx, span.endIdx);
  toRemove.forEach((c) => title.removeNode(c));

  const leading = span.hasKeywordOrPriority ? ' ' : '';
  const trailing = span.hasTagSuffix ? ' ' : '';
  const composed = `${leading}${newText}${trailing}`;
  if (!composed) return;

  const remaining = title.childrenList.slice(span.startIdx);
  remaining.forEach((c) => title.removeNode(c));
  title.addChild(buildTextNode(composed));
  remaining.forEach((c) => {
    detachNode(c);
    title.addChild(c);
  });
};

const replaceSectionBody = (headline: OrgNode, newBody: string): void => {
  const section = headline.section;
  if (!section) return;
  const childrenSnapshot = section.childrenList.slice();
  const toRemove = childrenSnapshot.slice(getBodyStartIdx(section));
  toRemove.forEach((c) => section.removeNode(c));

  const trimmed = newBody.trim();
  if (!trimmed) return;
  parseBodyNodes(`${trimmed}\n`).forEach((c) => {
    detachNode(c);
    section.addChild(c);
  });
};

const parseBodyNodes = (snippet: string): OrgNode[] => {
  const root = parse(`* X\n${snippet}`);
  const headline = root.childrenList.find((n) => n.is(NodeType.Headline));
  const section = headline?.section;
  if (!section) return [];
  const nodes = section.childrenList.slice();
  nodes.forEach((n) => section.removeNode(n));
  return nodes;
};

const readTitleText = (node: OrgNode): string => {
  const title = node.title;
  if (!title) return '';
  const { startIdx, endIdx } = getTitleTextSpan(title);
  return title.childrenList
    .slice(startIdx, endIdx)
    .map((c) => c.rawValue)
    .join('')
    .trim();
};

const readPriority = (node: OrgNode): string | undefined => {
  const priority = node.title?.childrenList.find((n) =>
    n.is(NodeType.Priority)
  );
  if (!priority) return undefined;
  const text = priority.childrenList.find((n) => n.is(NodeType.Text));
  if (!text) return undefined;
  return text.value.replace(/^#/, '').trim() || undefined;
};

const readTags = (node: OrgNode): readonly string[] => {
  const tagList = node.title?.childrenList.find((n) => n.is(NodeType.TagList));
  if (!tagList) return [];
  return tagList.childrenList
    .filter((n) => n.is(NodeType.Text))
    .map((n) => n.value)
    .filter(Boolean);
};

const readBody = (node: OrgNode): string => {
  const section = node.section;
  if (!section) return '';
  return section.childrenList
    .slice(getBodyStartIdx(section))
    .map((c) => c.rawValue)
    .join('')
    .replace(/\n+$/, '');
};

export const createOrgHeadline = (node: OrgNode): OrgHeadline => ({
  node,
  start: node.start,
  end: node.end,
  get level() {
    return node.level ?? 1;
  },
  scheduled: createPlanningSlot(node, 'SCHEDULED'),
  deadline: createPlanningSlot(node, 'DEADLINE'),
  closed: createPlanningSlot(node, 'CLOSED'),
  properties: createProperties(node),
  logbook: createLogbook(node),
  get text() {
    return readTitleText(node);
  },
  get todoKeyword() {
    return findTodoKeywordNode(node)?.value;
  },
  get priority() {
    return readPriority(node);
  },
  get tags() {
    return readTags(node);
  },
  get body() {
    return readBody(node);
  },
  setTodoKeyword: (keyword) => {
    const todoNode = findTodoKeywordNode(node);
    if (todoNode) {
      todoNode.setValue(keyword);
      return;
    }
    throw new Error(
      'OrgHeadline.setTodoKeyword: adding a keyword to a plain headline is not implemented in v1'
    );
  },
  clearTodoKeyword: () => {
    throw new Error('OrgHeadline.clearTodoKeyword is not implemented in v1');
  },
  setTitle: (text) => replaceTitleTextSpan(node, text),
  setPriority: () => {
    throw new Error('OrgHeadline.setPriority is not implemented in v1');
  },
  clearPriority: () => {
    throw new Error('OrgHeadline.clearPriority is not implemented in v1');
  },
  addTag: () => {
    throw new Error('OrgHeadline.addTag is not implemented in v1');
  },
  removeTag: () => {
    throw new Error('OrgHeadline.removeTag is not implemented in v1');
  },
  setTags: () => {
    throw new Error('OrgHeadline.setTags is not implemented in v1');
  },
  setLevel: (level) => {
    if (level < 1) throw new Error('Headline level must be \u2265 1');
    const current = node.level ?? 1;
    if (current === level) return;
    node.setLevel(level);
  },
  setBody: (body) => replaceSectionBody(node, body),
  remove: () => {
    node.parent?.removeNode(node);
  },
});
