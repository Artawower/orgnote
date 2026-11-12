import { parseOrgTimestamp } from 'org-mode-ast';
import type { OrgPlanningDate } from '../types';

export const parseOrgPlanningDate = (
  raw: string | undefined
): OrgPlanningDate | undefined => {
  if (raw === undefined) return undefined;
  return parseOrgTimestamp(raw) ?? undefined;
};
