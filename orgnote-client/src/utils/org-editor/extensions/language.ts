import type { Extension } from '@codemirror/state';
import type { Parser } from '@lezer/common';
import type { OrgNode } from 'org-mode-ast';
import { orgMode } from '../parser';

export interface OrgLanguageExtensionOptions {
  onAstChanged?: (node: OrgNode) => void;
  wrap?: Record<string, Parser>;
}

export const createOrgLanguageExtension = (opts: OrgLanguageExtensionOptions = {}): Extension =>
  orgMode({
    wrap: opts.wrap,
    orgAstChanged: opts.onAstChanged,
  });
