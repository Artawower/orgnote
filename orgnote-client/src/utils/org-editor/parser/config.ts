import type { Parser } from '@lezer/common';
import type { OrgNode } from 'org-mode-ast';

export interface OrgModeParserConfig {
  orgAstChanged?: (arg: OrgNode) => void;
  wrap?: {
    [langName: string]: Parser;
  };
}
