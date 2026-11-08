import { orgTags } from './tags';
import { HighlightStyle } from '@codemirror/language';
import type { Tag } from '@lezer/highlight';
import { tags } from '@lezer/highlight';
import { toKebabCase } from 'src/utils/to-kebab-case';

const highlightTagDefinitions = Object.entries(tags).filter(
  ([, val]) => typeof val !== 'function'
) as [string, Tag][];

export const orgHighlightStyle = HighlightStyle.define([
  ...Object.entries(orgTags).map(([key, tag]) => ({
    tag,
    class: `org-${toKebabCase(key)}`,
  })),
  ...highlightTagDefinitions.map(([key, tag]) => ({
    tag,
    class: `cm-${toKebabCase(key)}`,
  })),
]);
