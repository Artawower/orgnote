import type { OrgNode } from 'org-mode-ast';
import { NodeType, parse } from 'org-mode-ast';
import type { OrgProperties, OrgPropertyEntry } from '../types';
import { detachNode } from '../shared/detach-node';

const PROPERTY_HEAD = ':PROPERTIES:';
const PROPERTY_END = ':END:';
const PROPERTY_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;
const PROPERTY_MARKERS = new Set([PROPERTY_HEAD, PROPERTY_END]);

const isValueBoundary = (node: OrgNode): boolean =>
  node.is(NodeType.NewLine, NodeType.Indent, NodeType.Property);

const isBeforeFirstHeadline = (node: OrgNode): boolean => {
  const root = node.parent;
  if (!root) return false;
  const firstHeadline = root.childrenList.find((child) => child.is(NodeType.Headline));
  return !firstHeadline || node.start < firstHeadline.start;
};

interface DrawerBounds {
  readonly nodes: OrgNode[];
}

interface PropertySource {
  nodes(): OrgNode[];
  ensure(): void;
  replace(items: readonly OrgPropertyEntry[]): void;
}

const isDrawerMarker = (node: OrgNode, marker: string): boolean =>
  node.is(NodeType.Property) && node.rawValue.trim() === marker;

const isPropertyDrawerMarker = (node: OrgNode): boolean =>
  node.is(NodeType.Property) && PROPERTY_MARKERS.has(node.rawValue.trim());

const readPropertyKey = (property: OrgNode): string | undefined =>
  property.childrenList
    .find((child) => child.is(NodeType.Text))
    ?.value.replaceAll(':', '')
    .trim() || undefined;

const collectValueParts = (
  property: OrgNode,
  siblings: readonly OrgNode[],
  startIndex: number,
): string[] => {
  const parts: string[] = [];
  const ownChildren = property.childrenList;
  if (ownChildren.length >= 2) parts.push(ownChildren[ownChildren.length - 1].rawValue);
  for (let i = startIndex + 1; i < siblings.length; i += 1) {
    const sibling = siblings[i];
    if (isValueBoundary(sibling)) break;
    parts.push(sibling.rawValue);
  }
  return parts;
};

const readPropertyEntry = (
  property: OrgNode,
  siblings: readonly OrgNode[],
  index: number,
): OrgPropertyEntry | undefined => {
  if (isPropertyDrawerMarker(property)) return undefined;
  const key = readPropertyKey(property);
  if (!key) return undefined;
  const value = collectValueParts(property, siblings, index).join('').trim();
  return { key, value };
};

const normalizeEntries = (entries: readonly OrgPropertyEntry[]): OrgPropertyEntry[] => {
  const normalized: OrgPropertyEntry[] = [];
  entries.forEach((entry) => {
    const existingIndex = findEntryIndex(normalized, entry.key);
    if (existingIndex >= 0) normalized.splice(existingIndex, 1);
    normalized.push(entry);
  });
  return normalized;
};

const collectItems = (nodes: readonly OrgNode[]): OrgPropertyEntry[] =>
  normalizeEntries(
    nodes.flatMap((node, index) =>
      node.is(NodeType.Property) ? readPropertyEntryAsEntry(node, nodes, index) : [],
    ),
  );

const readPropertyEntryAsEntry = (
  node: OrgNode,
  nodes: readonly OrgNode[],
  index: number,
): OrgPropertyEntry[] => {
  const entry = readPropertyEntry(node, nodes, index);
  return entry ? [entry] : [];
};

const toEntriesRecord = (items: readonly OrgPropertyEntry[]): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.key, item.value]));

const findEntryIndex = (items: readonly OrgPropertyEntry[], key: string): number =>
  items.findIndex((item) => item.key.toLowerCase() === key.toLowerCase());

const assertPropertyKey = (key: string): string => {
  const trimmed = key.trim();
  if (!trimmed) throw new Error('OrgProperties: property key is required');
  if (!PROPERTY_KEY_PATTERN.test(trimmed)) {
    throw new Error(`OrgProperties: invalid property key ${JSON.stringify(key)}`);
  }
  return trimmed;
};

const assertPropertyValue = (value: string): string => {
  if (/\r|\n/.test(value)) {
    throw new Error('OrgProperties: property value must be single-line');
  }
  return value;
};

const formatPropertyLine = ({ key, value }: OrgPropertyEntry): string =>
  value ? `:${key}: ${value}` : `:${key}:`;

const formatDrawer = (items: readonly OrgPropertyEntry[]): string =>
  [PROPERTY_HEAD, ...items.map(formatPropertyLine), PROPERTY_END].join('\n');

const buildDrawerNode = (items: readonly OrgPropertyEntry[]): OrgNode => {
  const root = parse(formatDrawer(items));
  const drawer = root.childrenList.find((node) => node.is(NodeType.PropertyDrawer));
  if (!drawer) throw new Error('OrgProperties: failed to build property drawer');
  detachNode(drawer);
  return drawer;
};

const buildNewLineNode = (): OrgNode => {
  const root = parse('\n');
  const newLine = root.childrenList.find((node) => node.is(NodeType.NewLine));
  if (!newLine) throw new Error('OrgProperties: failed to build newline');
  detachNode(newLine);
  return newLine;
};

const replaceChildren = (
  parent: OrgNode,
  target: readonly OrgNode[],
  replacement: readonly OrgNode[],
): void => {
  const children = parent.childrenList.slice();
  const targetSet = new Set(target);
  const firstTargetIndex = children.findIndex((node) => targetSet.has(node));
  if (firstTargetIndex < 0) return;
  children.forEach((child) => parent.removeNode(child));
  children.forEach((child, index) => {
    if (index === firstTargetIndex) replacement.forEach((node) => parent.addChild(node));
    if (!targetSet.has(child)) parent.addChild(child);
  });
};

const insertChildrenAtStart = (parent: OrgNode, incoming: readonly OrgNode[]): void => {
  const children = parent.childrenList.slice();
  children.forEach((child) => parent.removeNode(child));
  incoming.forEach((node) => parent.addChild(node));
  children.forEach((child) => {
    detachNode(child);
    parent.addChild(child);
  });
};

const findHeadlinePropertyDrawer = (headline: OrgNode): OrgNode | undefined =>
  headline.section?.childrenList.find((node) => node.is(NodeType.PropertyDrawer));

const insertHeadlineDrawer = (headline: OrgNode, drawer: OrgNode): void => {
  const section = headline.section;
  if (!section) {
    throw new Error('OrgProperties: cannot create drawer on headline without section');
  }
  insertChildrenAtStart(section, [drawer, buildNewLineNode()]);
};

const createHeadlineSource = (headline: OrgNode): PropertySource => ({
  nodes: () => findHeadlinePropertyDrawer(headline)?.childrenList ?? [],
  ensure: () => {
    if (findHeadlinePropertyDrawer(headline)) return;
    insertHeadlineDrawer(headline, buildDrawerNode([]));
  },
  replace: (items) => {
    const existing = findHeadlinePropertyDrawer(headline);
    const incoming = buildDrawerNode(items);
    if (!existing) {
      insertHeadlineDrawer(headline, incoming);
      return;
    }
    replaceChildren(existing.parent!, [existing], [incoming]);
  },
});

const findRootPropertyDrawer = (root: OrgNode): OrgNode | undefined =>
  root.childrenList.find((node) => node.is(NodeType.PropertyDrawer) && isBeforeFirstHeadline(node));

const findRootPropertySequence = (root: OrgNode): DrawerBounds | undefined => {
  const children = root.childrenList;
  const firstHeadlineIndex = children.findIndex((node) => node.is(NodeType.Headline));
  const searchEnd = firstHeadlineIndex === -1 ? children.length : firstHeadlineIndex;
  const headIndex = children.findIndex(
    (node, index) => index < searchEnd && isDrawerMarker(node, PROPERTY_HEAD),
  );
  if (headIndex < 0) return undefined;
  const endIndex = children.findIndex(
    (node, index) => index > headIndex && index < searchEnd && isDrawerMarker(node, PROPERTY_END),
  );
  if (endIndex < 0) return undefined;
  return { nodes: children.slice(headIndex, endIndex + 1) };
};

const findRootBounds = (root: OrgNode): DrawerBounds | undefined => {
  const drawer = findRootPropertyDrawer(root);
  if (drawer) return { nodes: drawer.childrenList };
  return findRootPropertySequence(root);
};

const findRootReplacementTarget = (root: OrgNode): OrgNode[] | undefined => {
  const drawer = findRootPropertyDrawer(root);
  if (drawer) return [drawer];
  return findRootPropertySequence(root)?.nodes;
};

const insertRootDrawer = (root: OrgNode, drawer: OrgNode): void =>
  insertChildrenAtStart(root, [drawer, buildNewLineNode()]);

const createRootSource = (root: OrgNode): PropertySource => ({
  nodes: () => findRootBounds(root)?.nodes ?? [],
  ensure: () => {
    if (findRootBounds(root)) return;
    insertRootDrawer(root, buildDrawerNode([]));
  },
  replace: (items) => {
    const target = findRootReplacementTarget(root);
    const incoming = buildDrawerNode(items);
    if (!target) {
      insertRootDrawer(root, incoming);
      return;
    }
    replaceChildren(root, target, [incoming]);
  },
});

const upsertEntry = (
  items: readonly OrgPropertyEntry[],
  key: string,
  value: string,
): OrgPropertyEntry[] => {
  const next = [...items];
  const existingIndex = findEntryIndex(next, key);
  const entry = { key: assertPropertyKey(key), value: assertPropertyValue(value) };
  if (existingIndex < 0) return [...next, entry];
  next[existingIndex] = entry;
  return next;
};

const renameEntry = (
  items: readonly OrgPropertyEntry[],
  oldKey: string,
  newKey: string,
): OrgPropertyEntry[] => {
  const normalizedNewKey = assertPropertyKey(newKey);
  const targetIndex = findEntryIndex(items, oldKey);
  if (targetIndex < 0) return [...items];
  const duplicateIndex = findEntryIndex(items, normalizedNewKey);
  if (duplicateIndex >= 0 && duplicateIndex !== targetIndex) {
    throw new Error(`OrgProperties: duplicate property key ${JSON.stringify(newKey)}`);
  }
  return items.map((item, index) =>
    index === targetIndex ? { key: normalizedNewKey, value: item.value } : item,
  );
};

const removeEntry = (items: readonly OrgPropertyEntry[], key: string): OrgPropertyEntry[] =>
  items.filter((item) => item.key.toLowerCase() !== key.toLowerCase());

const createPropertiesFromSource = (source: PropertySource): OrgProperties => ({
  get entries() {
    return toEntriesRecord(this.items);
  },
  get items() {
    return collectItems(source.nodes());
  },
  ensure: () => source.ensure(),
  get: (key) => createPropertiesFromSource(source).entries[key],
  set: (key, value) => source.replace(upsertEntry(collectItems(source.nodes()), key, value)),
  rename: (oldKey, newKey) => source.replace(renameEntry(collectItems(source.nodes()), oldKey, newKey)),
  remove: (key) => source.replace(removeEntry(collectItems(source.nodes()), key)),
});

export const createProperties = (headline: OrgNode): OrgProperties =>
  createPropertiesFromSource(createHeadlineSource(headline));

export const createRootProperties = (root: OrgNode): OrgProperties =>
  createPropertiesFromSource(createRootSource(root));
