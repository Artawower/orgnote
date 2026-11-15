import { NodeType } from 'org-mode-ast';

export const cmNodes = [
  'FileTag',
  'ListBullet',
  'Headline-1',
  'Headline-2',
  'Headline-3',
  'Headline-4',
  'Headline-5',
  'Headline-6',
  'Headline-7',
  'Headline-8',
  'Headline-9',
  'Headline-10',
  'Headline-11',
  'Headline-12',
];
export const nodeIds = [...Object.keys(NodeType), ...cmNodes];

type NodeId = (typeof nodeIds)[number];

export const getOrgNodeId = (nodeId: NodeId): number => {
  return nodeIds.indexOf(nodeId);
};
