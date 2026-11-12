import type { Extension, ExtensionMeta } from 'orgnote-api';
import { orgInlineMarkupManifest } from './org-inline-markup/manifest';
import { orgTableManifest } from './org-table/manifest';
import { orgSrcBlockManifest } from './org-src-block/manifest';
import { orgQuoteBlockManifest } from './org-quote-block/manifest';
import { orgLatexBlockManifest } from './org-latex-block/manifest';
import { orgPropertyDrawerManifest } from './org-property-drawer/manifest';
import { orgHtmlBlockManifest } from './org-html-block/manifest';
import { orgImageManifest } from './org-image/manifest';
import { orgSmartEditingManifest } from './org-smart-editing/manifest';
import { orgFoldingManifest } from './org-folding/manifest';
import { orgKeywordOverlayManifest } from './org-keyword-overlay/manifest';
import { orgTocManifest } from './org-toc/manifest';
import { recentfManifest } from './recentf/manifest';
import { randomNoteManifest } from './random-note/manifest';
import { commandHistoryManifest } from './command-history/manifest';
import { orgTasksSidebarManifest } from './org-tasks-sidebar/manifest';
import { localGraphManifest } from './local-graph/manifest';
import { orgAgendaManifest } from './org-agenda/manifest';
import { orgTemplatesManifest } from './org-templates/manifest';

type ExtensionLoader = () => Promise<Extension>;

export const BUILTIN_LOADERS: Record<string, ExtensionLoader> = {
  [orgInlineMarkupManifest.name]: () =>
    import('./org-inline-markup').then((m) => m.orgInlineMarkupExtension),
  [orgTableManifest.name]: () => import('./org-table').then((m) => m.orgTableExtension),
  [orgSrcBlockManifest.name]: () => import('./org-src-block').then((m) => m.orgSrcBlockExtension),
  [orgQuoteBlockManifest.name]: () =>
    import('./org-quote-block').then((m) => m.orgQuoteBlockExtension),
  [orgLatexBlockManifest.name]: () =>
    import('./org-latex-block').then((m) => m.orgLatexBlockExtension),
  [orgPropertyDrawerManifest.name]: () =>
    import('./org-property-drawer').then((m) => m.orgPropertyDrawerExtension),
  [orgHtmlBlockManifest.name]: () =>
    import('./org-html-block').then((m) => m.orgHtmlBlockExtension),
  [orgImageManifest.name]: () => import('./org-image').then((m) => m.orgImageExtension),
  [orgSmartEditingManifest.name]: () =>
    import('./org-smart-editing').then((m) => m.orgSmartEditingExtension),
  [orgFoldingManifest.name]: () => import('./org-folding').then((m) => m.orgFoldingExtension),
  [orgKeywordOverlayManifest.name]: () =>
    import('./org-keyword-overlay').then((m) => m.orgKeywordOverlayExtension),
  [orgTocManifest.name]: () => import('./org-toc').then((m) => m.orgTocExtension),
  [recentfManifest.name]: () => import('./recentf').then((m) => m.recentfExtension),
  [randomNoteManifest.name]: () => import('./random-note').then((m) => m.randomNoteExtension),
  [commandHistoryManifest.name]: () =>
    import('./command-history').then((m) => m.commandHistoryExtension),
  [orgTasksSidebarManifest.name]: () =>
    import('./org-tasks-sidebar').then((m) => m.orgTasksSidebarExtension),
  [localGraphManifest.name]: () => import('./local-graph').then((m) => m.localGraphExtension),
  [orgAgendaManifest.name]: () => import('./org-agenda').then((m) => m.orgAgendaExtension),
  [orgTemplatesManifest.name]: () =>
    import('./org-templates').then((m) => m.orgTemplatesExtension),
};

export const BUILTIN_META: ExtensionMeta[] = [
  { manifest: orgInlineMarkupManifest, active: true },
  { manifest: orgTableManifest, active: true },
  { manifest: orgSrcBlockManifest, active: true },
  { manifest: orgQuoteBlockManifest, active: true },
  { manifest: orgLatexBlockManifest, active: true },
  { manifest: orgPropertyDrawerManifest, active: true },
  { manifest: orgHtmlBlockManifest, active: true },
  { manifest: orgImageManifest, active: true },
  { manifest: orgSmartEditingManifest, active: true },
  { manifest: orgFoldingManifest, active: true },
  { manifest: orgKeywordOverlayManifest, active: true },
  { manifest: orgTocManifest, active: true },
  { manifest: recentfManifest, active: true },
  { manifest: randomNoteManifest, active: true },
  { manifest: commandHistoryManifest, active: true },
  { manifest: orgTasksSidebarManifest, active: true },
  { manifest: localGraphManifest, active: true },
  { manifest: orgAgendaManifest, active: true },
  { manifest: orgTemplatesManifest, active: true },
];
