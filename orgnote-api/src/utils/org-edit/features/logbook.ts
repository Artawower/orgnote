import type { OrgNode } from 'org-mode-ast';
import { NodeType, parse } from 'org-mode-ast';
import type { OrgLogbook, OrgLogbookEntry } from '../types';
import { formatInactiveTimestamp } from '../shared/format-org-timestamp';
import { detachNode } from '../shared/detach-node';
import { parseOrgPlanningDate } from '../shared/parse-org-stamp';
import { buildLocalDate } from '../shared/build-local-date';

const LOGBOOK_HEAD = ':LOGBOOK:';
const LOGBOOK_END = ':END:';

interface LogbookBounds {
  head: OrgNode;
  end: OrgNode;
}

const isPropertyWith = (node: OrgNode, marker: string): boolean =>
  node.is(NodeType.Property) && node.rawValue.trim() === marker;

const findLogbookBounds = (section: OrgNode): LogbookBounds | undefined => {
  const head = section.childrenList.find((n) =>
    isPropertyWith(n, LOGBOOK_HEAD)
  );
  if (!head) return undefined;
  const end = section.childrenList.find(
    (n) => n.start > head.start && isPropertyWith(n, LOGBOOK_END)
  );
  if (!end) return undefined;
  return { head, end };
};

const getLogbookContentNodes = (
  section: OrgNode,
  bounds: LogbookBounds
): OrgNode[] => {
  return section.childrenList.filter(
    (n) => n.start >= bounds.head.end && n.end <= bounds.end.start
  );
};

const findTrailingNewLine = (
  section: OrgNode,
  head: OrgNode
): OrgNode | undefined =>
  section.childrenList.find(
    (n) => n.start === head.end && n.is(NodeType.NewLine)
  );

const findEndTrailingNewLine = (
  section: OrgNode,
  end: OrgNode
): OrgNode | undefined =>
  section.childrenList.find(
    (n) => n.start === end.end && n.is(NodeType.NewLine)
  );

const findPlanningTrailingNewLine = (section: OrgNode): OrgNode | undefined => {
  const planning = section.childrenList.find((n) => n.is(NodeType.Planning));
  if (!planning) return undefined;
  return section.childrenList.find(
    (n) => n.start === planning.end && n.is(NodeType.NewLine)
  );
};

interface NewDrawerInsertion {
  anchor?: OrgNode;
  needsLeadingNewLine: boolean;
}

const resolveNewDrawerInsertion = (section: OrgNode): NewDrawerInsertion => {
  const propertyDrawer = section.childrenList.find((node) =>
    node.is(NodeType.PropertyDrawer)
  );
  if (!propertyDrawer) {
    return {
      anchor: findPlanningTrailingNewLine(section),
      needsLeadingNewLine: false,
    };
  }
  const trailingNewLine = findTrailingNewLine(section, propertyDrawer);
  return {
    anchor: trailingNewLine ?? propertyDrawer,
    needsLeadingNewLine: trailingNewLine === undefined,
  };
};

interface ParsedSnippet {
  nodes: OrgNode[];
}

const parseSectionSnippet = (snippet: string): ParsedSnippet => {
  const root = parse(`* X\n${snippet}`);
  const headline = root.childrenList.find((n) => n.is(NodeType.Headline));
  const section = headline?.section;
  if (!section) {
    throw new Error(
      `parseSectionSnippet: no section produced for ${JSON.stringify(snippet)}`
    );
  }
  const nodes = section.childrenList.slice();
  nodes.forEach((n) => section.removeNode(n));
  nodes.forEach(detachNode);
  return { nodes };
};

const insertNodesAfter = (
  section: OrgNode,
  anchor: OrgNode | undefined,
  nodes: OrgNode[]
): void => {
  const allChildren = section.childrenList.slice();
  allChildren.forEach((c) => section.removeNode(c));
  const anchorIndex = anchor ? allChildren.indexOf(anchor) : -1;
  const reordered =
    anchorIndex >= 0
      ? [
          ...allChildren.slice(0, anchorIndex + 1),
          ...nodes,
          ...allChildren.slice(anchorIndex + 1),
        ]
      : [...nodes, ...allChildren];
  reordered.forEach((c) => {
    detachNode(c);
    section.addChild(c);
  });
};

const insertNodesAtStart = (section: OrgNode, nodes: OrgNode[]): void =>
  insertNodesAfter(section, undefined, nodes);

const removeNodes = (section: OrgNode, nodes: OrgNode[]): void => {
  nodes.forEach((n) => {
    if (n.parent === section) section.removeNode(n);
  });
};

const formatStateChangeLine = (from: string, to: string, at: Date): string =>
  `- State "${to}" from "${from}" ${formatInactiveTimestamp(at)}\n`;

const formatClockOpenLine = (start: Date): string =>
  `CLOCK: ${formatInactiveTimestamp(start)}\n`;

const formatClockClosedLine = (start: Date, end: Date): string => {
  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const dur = `${h}:${String(m).padStart(2, '0')}`;
  return `CLOCK: ${formatInactiveTimestamp(start)}--${formatInactiveTimestamp(end)} =>  ${dur}\n`;
};

const buildEntrySnippetNodes = (entryText: string): OrgNode[] =>
  parseSectionSnippet(entryText).nodes;

const STATE_CHANGE_PREFIX_RE = /^State "([^"]+)" from "([^"]+)"/;

const findChildOfType = (
  parent: OrgNode | undefined,
  type: NodeType
): OrgNode | undefined => parent?.childrenList.find((n) => n.is(type));

const readListItemDate = (listItem: OrgNode): Date | undefined => {
  const dateNode = findChildOfType(listItem.title, NodeType.Date);
  if (!dateNode) return undefined;
  const parsed = parseOrgPlanningDate(dateNode.rawValue);
  return parsed ? buildLocalDate(parsed) : undefined;
};

const readListItemStateChange = (
  listItem: OrgNode
): { fromKeyword: string; toKeyword: string } | undefined => {
  const textNode = findChildOfType(listItem.title, NodeType.Text);
  if (!textNode) return undefined;
  const match = STATE_CHANGE_PREFIX_RE.exec(textNode.value.trim());
  if (!match) return undefined;
  const [, toKeyword, fromKeyword] = match;
  if (!toKeyword || !fromKeyword) return undefined;
  return { toKeyword, fromKeyword };
};

const parseEntryNode = (node: OrgNode): OrgLogbookEntry | undefined => {
  if (node.is(NodeType.NewLine)) return undefined;
  const raw = node.rawValue.replace(/\n$/, '');
  if (node.is(NodeType.List)) return undefined;
  if (node.is(NodeType.ListItem)) {
    const stateChange = readListItemStateChange(node);
    if (!stateChange) return { type: 'note', raw };
    return {
      type: 'state-change',
      raw,
      fromKeyword: stateChange.fromKeyword,
      toKeyword: stateChange.toKeyword,
      timestamp: readListItemDate(node),
    };
  }
  if (node.is(NodeType.Clock)) {
    return { type: 'clock', raw };
  }
  return { type: 'unknown', raw };
};

const expandListEntries = (nodes: OrgNode[]): OrgNode[] =>
  nodes.flatMap((n) => (n.is(NodeType.List) ? n.childrenList : [n]));

const collectTypedEntries = (
  section: OrgNode,
  bounds: LogbookBounds
): OrgLogbookEntry[] => {
  const raw = getLogbookContentNodes(section, bounds);
  const expanded = expandListEntries(raw);
  return expanded
    .map(parseEntryNode)
    .filter((entry): entry is OrgLogbookEntry => entry !== undefined);
};

export const createLogbook = (headline: OrgNode): OrgLogbook => {
  const ensureSection = (): OrgNode => {
    if (!headline.section) {
      throw new Error(
        'OrgLogbook: cannot mutate logbook on headline without a section'
      );
    }
    return headline.section;
  };

  const insertEntryAtTopOrCreateDrawer = (entrySnippet: string): void => {
    const section = ensureSection();
    const bounds = findLogbookBounds(section);
    if (bounds) {
      const trailing = findTrailingNewLine(section, bounds.head);
      const newNodes = buildEntrySnippetNodes(entrySnippet);
      insertNodesAfter(section, trailing ?? bounds.head, newNodes);
      return;
    }
    const insertion = resolveNewDrawerInsertion(section);
    const leadingNewLine = insertion.needsLeadingNewLine ? '\n' : '';
    const drawer = `${leadingNewLine}${LOGBOOK_HEAD}\n${entrySnippet}${LOGBOOK_END}\n`;
    const drawerNodes = buildEntrySnippetNodes(drawer);
    if (insertion.anchor) {
      insertNodesAfter(section, insertion.anchor, drawerNodes);
      return;
    }
    insertNodesAtStart(section, drawerNodes);
  };

  const removeStateChangeEntry = (filter: {
    to: string;
    date: string;
  }): boolean => {
    const section = ensureSection();
    const bounds = findLogbookBounds(section);
    if (!bounds) return false;
    const contentNodes = getLogbookContentNodes(section, bounds);
    const list = contentNodes.find((n) => n.is(NodeType.List));
    if (!list) return false;

    const matching = list.childrenList.find((listItem) => {
      if (!listItem.is(NodeType.ListItem)) return false;
      const stateChange = readListItemStateChange(listItem);
      if (!stateChange || stateChange.toKeyword !== filter.to) return false;
      const dateNode = findChildOfType(listItem.title, NodeType.Date);
      const parsed = dateNode
        ? parseOrgPlanningDate(dateNode.rawValue)
        : undefined;
      return parsed?.date.startsWith(filter.date) ?? false;
    });
    if (!matching) return false;
    list.removeNode(matching);

    if (list.childrenList.length === 0) {
      removeDrawer(section, bounds);
    }
    return true;
  };

  const removeDrawer = (section: OrgNode, bounds: LogbookBounds): void => {
    const headNl = findTrailingNewLine(section, bounds.head);
    const endNl = findEndTrailingNewLine(section, bounds.end);
    const contentNodes = getLogbookContentNodes(section, bounds);
    const toRemove = [bounds.head];
    if (headNl) toRemove.push(headNl);
    toRemove.push(...contentNodes);
    toRemove.push(bounds.end);
    if (endNl) toRemove.push(endNl);
    removeNodes(section, toRemove);
  };

  return {
    get entries() {
      const section = headline.section;
      if (!section) return [];
      const bounds = findLogbookBounds(section);
      if (!bounds) return [];
      return collectTypedEntries(section, bounds);
    },
    appendStateChange: ({ from, to, at }) => {
      insertEntryAtTopOrCreateDrawer(formatStateChangeLine(from, to, at));
    },
    removeStateChange: removeStateChangeEntry,
    openClock: (start) => {
      insertEntryAtTopOrCreateDrawer(formatClockOpenLine(start));
    },
    closeClock: ({ start, end }) => {
      const section = ensureSection();
      const bounds = findLogbookBounds(section);
      if (!bounds) return false;
      const openLine = formatClockOpenLine(start).trimEnd();
      const contentNodes = getLogbookContentNodes(section, bounds);
      const matching = contentNodes.find(
        (n) => n.is(NodeType.Clock) && n.rawValue.trim() === openLine
      );
      if (!matching) return false;
      const trailingNl = section.childrenList.find(
        (n) => n.start === matching.end && n.is(NodeType.NewLine)
      );
      const closedNodes = buildEntrySnippetNodes(
        formatClockClosedLine(start, end)
      );
      const allChildren = section.childrenList.slice();
      const matchIdx = allChildren.indexOf(matching);
      if (matchIdx < 0) return false;
      const trailingIdx = trailingNl ? allChildren.indexOf(trailingNl) : -1;
      allChildren.forEach((c) => section.removeNode(c));
      const reordered: OrgNode[] = [];
      allChildren.forEach((c, i) => {
        if (i === matchIdx) {
          reordered.push(...closedNodes);
          return;
        }
        if (i === trailingIdx) return;
        reordered.push(c);
      });
      reordered.forEach((c) => {
        detachNode(c);
        section.addChild(c);
      });
      return true;
    },
    appendClock: ({ start, end }) => {
      insertEntryAtTopOrCreateDrawer(formatClockClosedLine(start, end));
    },
    removeClock: (isoDate: string): boolean => {
      const section = ensureSection();
      const bounds = findLogbookBounds(section);
      if (!bounds) return false;
      const contentNodes = getLogbookContentNodes(section, bounds);
      const matching = contentNodes.find(
        (n) => n.is(NodeType.Clock) && n.rawValue.includes(isoDate)
      );
      if (!matching) return false;
      const trailingNl = section.childrenList.find(
        (n) => n.start === matching.end && n.is(NodeType.NewLine)
      );
      removeNodes(section, trailingNl ? [matching, trailingNl] : [matching]);
      return true;
    },
    clear: () => {
      const section = headline.section;
      if (!section) return;
      const bounds = findLogbookBounds(section);
      if (!bounds) return;
      removeDrawer(section, bounds);
    },
  };
};
