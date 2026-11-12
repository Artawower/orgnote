import type { EditorView } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import { NodeType, parse, walkTree } from 'org-mode-ast';
import type { OrgPropertyEntry } from 'orgnote-api';
import { selectOrgDocument } from 'orgnote-api/utils';
import type { PropertyEditorState, PropertyScope } from './property-model';

const normalizePropertyValue = (value: string): string =>
  value
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

const formatPropertyLine = ({ key, value }: OrgPropertyEntry): string => {
  const normalizedValue = normalizePropertyValue(value);
  return normalizedValue ? `:${key}: ${normalizedValue}` : `:${key}:`;
};

const formatPropertyDrawer = (items: readonly OrgPropertyEntry[]): string =>
  [PROPERTY_HEAD, ...items.map(formatPropertyLine), PROPERTY_END].join('\n');

const PROPERTY_HEAD = ':PROPERTIES:';
const PROPERTY_END = ':END:';

const documentText = (view: EditorView): string => view.state.doc.toString();

const isRootPropertyDrawer = (node: OrgNode): boolean =>
  node.is(NodeType.PropertyDrawer) && Boolean(node.parent?.is(NodeType.Root));

const isPropertyWidgetNode = (node: OrgNode): boolean =>
  node.is(NodeType.PropertyDrawer) || isRootPropertySequenceStart(node);

const isPagePropertyWidgetNode = (node: OrgNode): boolean =>
  isRootPropertyDrawer(node) || isRootPropertySequenceStart(node);

const findCurrentPropertyNodeAtStart = (root: OrgNode, sourceNode: OrgNode): OrgNode | undefined => {
  let currentNode: OrgNode | undefined;
  walkTree(root, (node) => {
    if (node.start !== sourceNode.start) return false;
    if (!isPropertyWidgetNode(node)) return false;
    currentNode = node;
    return true;
  });
  return currentNode;
};

const findCurrentPagePropertyNode = (root: OrgNode): OrgNode | undefined =>
  root.childrenList.find(isPagePropertyWidgetNode);

const findCurrentPropertyNode = (content: string, sourceNode: OrgNode): OrgNode | undefined => {
  const root = parse(content);
  if (getPropertyScope(sourceNode) === 'page') {
    return findCurrentPagePropertyNode(root) ?? findCurrentPropertyNodeAtStart(root, sourceNode);
  }
  return findCurrentPropertyNodeAtStart(root, sourceNode);
};

const getCurrentPropertyWidgetRange = (view: EditorView, node: OrgNode): { from: number; to: number } =>
  getPropertyWidgetRange(findCurrentPropertyNode(documentText(view), node) ?? node);

export const replacePropertyItems = (
  view: EditorView,
  node: OrgNode,
  items: readonly OrgPropertyEntry[],
  onApplied?: () => void,
): void => {
  const range = getCurrentPropertyWidgetRange(view, node);
  const insert = formatPropertyDrawer(items);
  const docLength = view.state.doc.length;
  if (range.from > docLength) return;
  const cursorPosition = view.state.selection.main.head;
  const changes = { from: range.from, to: Math.min(range.to, docLength), insert };
  view.dispatch({
    changes,
    selection: { anchor: view.state.changes(changes).mapPos(cursorPosition) },
  });
  onApplied?.();
};

const readPropertiesState = (
  content: string,
  scope: PropertyScope,
  anchor: number,
  stateId: string,
): PropertyEditorState => {
  const items = selectOrgDocument(content, (doc) => {
    const properties = scope === 'page' ? doc.properties : doc.headlineAt(anchor)?.properties;
    return properties?.items ?? [];
  });
  return { scope, stateId, items };
};

export const getPropertyEditorState = (
  view: EditorView,
  scope: PropertyScope,
  anchor: number,
  stateId: string,
): PropertyEditorState => readPropertiesState(documentText(view), scope, anchor, stateId);

export const insertEmptyPropertyDrawer = (view: EditorView, position: number): void => {
  const insert = `${formatPropertyDrawer([])}\n`;
  const safePosition = Math.min(position, view.state.doc.length);
  view.dispatch({
    changes: { from: safePosition, to: safePosition, insert },
    selection: { anchor: safePosition },
  });
};

const nodeText = (node: OrgNode): string => node.rawValue.trim();

const isRootPropertyStart = (node: OrgNode): boolean =>
  node.is(NodeType.Property) &&
  nodeText(node) === PROPERTY_HEAD &&
  Boolean(node.parent?.is(NodeType.Root));

const firstHeadlineStart = (root: OrgNode): number =>
  root.childrenList.find((child) => child.is(NodeType.Headline))?.start ?? Number.POSITIVE_INFINITY;

export const isRootPropertySequenceStart = (node: OrgNode): boolean => {
  const root = isRootPropertyStart(node) ? node.parent : undefined;
  return Boolean(root && node.start < firstHeadlineStart(root));
};

const findRootSequenceEnd = (node: OrgNode): OrgNode | undefined => {
  const root = node.parent;
  if (!root) return undefined;
  const headlineStart = firstHeadlineStart(root);
  return root.childrenList.find(
    (child) => child.start > node.start && child.start < headlineStart && nodeText(child) === PROPERTY_END,
  );
};

export const getPropertyWidgetRange = (node: OrgNode): { from: number; to: number } => {
  if (node.is(NodeType.PropertyDrawer)) return { from: node.start, to: node.end };
  const end = findRootSequenceEnd(node);
  return { from: node.start, to: end?.end ?? node.end };
};

export const getPropertyEditPosition = (node: OrgNode, docLength: number): number =>
  Math.min(getPropertyWidgetRange(node).to, docLength);

export const getPropertyScope = (node: OrgNode): PropertyScope =>
  node.parent?.is(NodeType.Section) ? 'headline' : 'page';

export const getPropertyStateKey = (node: OrgNode): string => {
  const scope = getPropertyScope(node);
  return `${scope}:${node.start}`;
};

