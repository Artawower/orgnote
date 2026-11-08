export const ORG_PRIORITY_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
export type OrgPriorityLetter = (typeof ORG_PRIORITY_LETTERS)[number];
