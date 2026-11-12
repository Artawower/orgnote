import type { OrgModeParserConfig } from './config';
import { orgFoldProps } from './folding';
import { orgIndentProps } from './indent';
import { getOrgNodeId } from './node-ids';
import { orgHighlightStyle } from './syntax-highlighting';
import { orgTagsStyles } from './tags';
import {
  Language,
  LanguageSupport,
  defineLanguageFacet,
  syntaxHighlighting,
} from '@codemirror/language';
import type { Input, PartialParse } from '@lezer/common';
import { NodeType, Parser, Tree } from '@lezer/common';
import type { OrgNode } from 'org-mode-ast';
import { NodeType as OrgNodeType, parse, withMetaInfo } from 'org-mode-ast';

let lastParsedOrgNode: OrgNode | null = null;

export const getLastParsedOrgNode = (): OrgNode | null => lastParsedOrgNode;

class OrgNodeParser extends Parser {
  constructor(private config?: OrgModeParserConfig) {
    super();
  }

  createParse(input: Input): PartialParse {
    const doc = input.read(0, input.length);
    const parsedDoc = withMetaInfo(parse(doc));

    lastParsedOrgNode = parsedDoc;
    this.config?.orgAstChanged?.(parsedDoc);

    return {
      advance: (): Tree | null => {
        const tree = this.convertOrgModeTreeToCmTree(parsedDoc, doc);
        return tree;
      },
      parsedPos: input.length,
      stopAt: () => {
        // pass
      },
      stoppedAt: input.length,
    };
  }

  private convertOrgModeTreeToCmTree(orgNode: OrgNode, input: string): Tree {
    const sectionChildren = [];
    if (orgNode.title) {
      sectionChildren.push(orgNode.title);
    }

    if (orgNode.section) {
      sectionChildren.push(orgNode.section);
    }

    const children = orgNode.children ?? sectionChildren;

    const nestedParsedTree = this.tryParseNestedCodeBlock(input, orgNode);
    if (nestedParsedTree) {
      return nestedParsedTree;
    }

    const nodeName = this.getCmNodeNameByOrgNode(orgNode);
    return new Tree(
      NodeType.define({
        id: getOrgNodeId(nodeName),
        name: nodeName,
        top: orgNode.is(OrgNodeType.Root),
        props: [orgTagsStyles, orgFoldProps, orgIndentProps],
      }),
      children?.map((c) => this.convertOrgModeTreeToCmTree(c, input)) ?? [],
      children?.map((c) => c.start - orgNode.start),
      orgNode.length,
    );
  }

  private getCmNodeNameByOrgNode(orgNode: OrgNode): string {
    if (orgNode.is(OrgNodeType.Title) && orgNode.parent?.is(OrgNodeType.Headline)) {
      return `Headline-${orgNode.parent.level}`;
    }

    if (
      orgNode.is(OrgNodeType.Operator) &&
      orgNode.parent?.parent?.is(OrgNodeType.ListItem) &&
      orgNode?.parent.isNot(OrgNodeType.Section) &&
      (orgNode.value === '- ' || orgNode.value === '+ ')
    ) {
      return 'ListBullet';
    }

    if (orgNode.is(OrgNodeType.Text) && orgNode.parent?.is(OrgNodeType.TagList)) {
      return 'FileTag';
    }
    return orgNode.type;
  }

  private tryParseNestedCodeBlock(input: string, orgNode: OrgNode): Tree | null {
    const parent = orgNode.parent;
    if (!parent) return null;

    if (
      !orgNode.is(OrgNodeType.BlockBody) ||
      !parent.is(OrgNodeType.SrcBlock, OrgNodeType.HtmlBlock)
    ) {
      return null;
    }

    const language = parent.properties.language?.toLowerCase();
    if (!language && !parent.is(OrgNodeType.HtmlBlock)) {
      return null;
    }

    const parserName = language ?? (parent.is(OrgNodeType.HtmlBlock) ? 'html' : null);
    if (!parserName) return null;

    const nestedParser = this.config?.wrap?.[parserName];
    if (!nestedParser) {
      return null;
    }

    return nestedParser.parse(input.slice(orgNode.start, orgNode.end));
  }
}

function initLanguage(config?: OrgModeParserConfig): Language {
  const facet = defineLanguageFacet();
  const parser = new OrgNodeParser(config);
  const orgModeLanguage = new Language(facet, parser, [], 'org-mode');
  return orgModeLanguage;
}

export function orgMode(config?: OrgModeParserConfig): LanguageSupport {
  return new LanguageSupport(initLanguage(config), [syntaxHighlighting(orgHighlightStyle)]);
}
