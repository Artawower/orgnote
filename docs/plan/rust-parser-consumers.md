# org-mode-ast consumer inventory

**Status: P0 input for [Rust parser replacement](rust-parser-replacement.md)**
**Created: 2026-11-12**

What the replacement facade must keep working. Counts come from `rg` over `orgnote-api/src`, `orgnote-client/src`, `orgnote-cli` and `orgnote-extensions` at jj `wrqtwtsp` (`f1b423ca`). Member counts match by name, so generic names such as `parent`, `children` and `is` include unrelated hits. They show order of magnitude, not exact call counts.

## Baselines

| Workspace | Declared `org-mode-ast` | Runtime use |
| --- | --- | --- |
| `orgnote-api` | `0.13.6` | 21 non-test files |
| `orgnote-client` | `0.13.6` | 92 non-test files |
| `orgnote-cli` | `0.11.7` | None: no imports, only `types` in `tsconfig.json`. Parsing reaches the CLI only through `orgnote-api`. |
| `orgnote-extensions` | — | None: theme recipes only |

Published `org-mode-ast@0.13.6` was built from `org-mode-ast` commit `900b772b`, the current master. The comparison driver in `rust-org-mode-ast/tests/compat` pins this version.

## Public extension contract

The API exposes the TS AST to extensions, so the AST types are part of the extension contract, not an internal detail:

- `orgnote-api/src/index.ts` exports `ast`, a type-only namespace (`import type * as ast`). It is erased from `dist/index.js`, so it carries no runtime API. Extensions get runtime `OrgNode` objects only through the callbacks and getters below.
- `models/widget.ts`: widget `satisfied`, `viewUpdater`, `rangeBuilder`, `editPositionBuilder` and `classBuilder` receive `OrgNode`; widget registries are keyed by `NodeType` values.
- `models/editor.ts`, `editor-store.ts`, `active-editor-context.ts`: `orgNodeGetter`, `root` and `orgNode` are `OrgNode`.
- `models/file-meta.ts`: `OrgDate` and `ClockEntry` shape stored file metadata.
- `api.ts`: widget registration carries a `nodeType: NodeType`.

The replacement must keep these types or ship a versioned contract change. External extensions outside the monorepo are not inventoried. Their compatibility window is still an open decision.

## Imported symbols

| Symbol | api | client | Notes |
| --- | --- | --- | --- |
| `OrgNode` (value and type) | 14 | 78 | Main contract |
| `NodeType` | 8 | 47 | 54 distinct members used; widget keys |
| `parse` | 7 | 27 | See call sites below |
| `withMetaInfo` | 1 | 19 | Metadata for indexing, agenda, rendering |
| `walkTree` | 1 | 17 | Recursive traversal |
| `OrgRepeater`, `OrgDate`, `ClockEntry`, `TimeUnit`, `Heading` | 6 | 24 | Metadata and planning types |
| `findParent`, `walkThroughParents`, `findNextSibling` | 1 | 3 | Navigation helpers |
| `parseOrgTimestamp` | 1 | 0 | `org-edit` repeaters |

The diff exports (`getDiff`, `findOrgNodesDiff`), `withSuperficialInfo` and `withOptionalMetaInfo` are not imported. Keeping them is a compatibility choice for external extensions only.

## OrgNode members in use

| Group | Members (approximate hits / files) |
| --- | --- |
| Read: shape | `type`/`is` (171/27), `isNot` (28/11), `start`/`end`, `parent` (87/16), `children` (46/21), `childrenList` (72/12), `title` (26/15), `section` (22/9), `next` (10/5), `prev` (3/2), `lastChild` (1/1), `first`/`last` |
| Read: content | `rawValue` (53/23), `cleanValue` (3/2), `value`, `toString` (14/12) |
| Read: semantic | `level` (13/8), `checked` (4/4), `ordered` (5/4), `properties` (4/3), per-node `meta` (13/7) |
| Mutation | `addChild` (13/4), `removeNode` (16/4), `removeNodes` (2/1), `setValue` (9/4), `setLevel` (3/3), `setTitle` (2/2) |

Mutation methods are called only in `orgnote-api/src/utils/org-edit/features/{properties,create-task,headline,planning,logbook}.ts` and `orgnote-client/src/extensions/org-agenda/mutations/task-title.ts`. Each one parses a small snippet, edits the mutable tree and serializes it with `rawValue`. One reference is written directly: `org-edit/shared/detach-node.ts:4` sets `node.parent = null`. P3 hydration must support this path, including position shifts and writable parent links.

## OrgChildrenList contract

`children` is an `OrgChildrenList`, not an array. Hydrated DTO arrays do not satisfy this contract. Consumers use:

| Use | Members (approximate hits / files) | Example |
| --- | --- | --- |
| Indexed access | `get` (13/9), `first` (9/6), `last` (3/2), `length` (9/7) | `org-smart-editing/enter-rules.ts:230` `children.get(1)`; `components/org-nodes/OrgLink.vue` |
| Search and projection | `find` (46/12), `filter` (4/4), `map` (2/1), `slice` (16/5), `forEach` (10/3) | `org-editor/parser/parser.ts:72` `children?.map(...)` |
| Iteration | `for … of`, spread | `utils/org-ast.ts:11`, `enter-rules.ts:97` |

Return types matter: `slice` and `filter` return `OrgChildrenList`, while `map` returns an array. `childrenList` is the array view (`some` and other array methods are called on it). Counts include unrelated trees with a `children` field, such as the layout and TOC stores.

## Parse call sites

| Path | Call | Thread |
| --- | --- | --- |
| `client/src/utils/org-editor/parser/parser.ts` | `withMetaInfo(parse(doc))` in `createParse()` | Main; eager full parse (P4) |
| `client/src/utils/org-editor/extensions/rendering.ts` (×3), `org-title-parser.ts` | `withMetaInfo(parse(HEADLINE_PREFIX + text))` | Main; small snippets |
| `client/src/stores/file-search.ts` | `withMetaInfo(parse(content))` | Main; indexing every file (P5 worker candidate) |
| `client/src/extensions/org-agenda/mutations/task-{tags,priority}.ts` | `withMetaInfo(parse(content))` | Main; whole file per mutation |
| `client/src/extensions/org-tasks-sidebar/task-toggle.ts`, `org-property-drawer/property-source.ts` | `parse(content)` | Main; whole file |
| `client/src/extensions/org-keyword-overlay/OrgTitleEditor.vue` | `walkTree(parse(doc))` | Main; whole editor document |
| `api/src/encryption/note-encryption.ts` | `withMetaInfo(parse(decrypted))` | Caller's thread; metadata after decryption |
| `api/src/utils/org-edit/edit-org-document.ts` (×2) | `parse(content)` | Caller's thread; whole document |
| `api/src/utils/org-edit/features/*` (×6) | `parse(snippet)` | Caller's thread; snippets for insertion |

No worker parses Org today (`orgnote-client/src/workers` has no parser import). Several paths parse the same document version independently. P5 duplicate removal starts here.

## Behaviour that consumers depend on

Gaps from the comparison ledger (`rust-org-mode-ast/tests/compat/README.md`) mapped to the code that would break:

| Ledger id | Consumer |
| --- | --- |
| B2 (property source loss) | `org-edit/features/properties.ts`, `org-property-drawer` |
| B4 (CLOCK in LOGBOOK, indented drawers) | `org-edit/features/logbook.ts`, agenda clock reports, `file-meta.ts` `ClockEntry` |
| B5 (tags, FILETAGS) | `file-search.ts` index, agenda tag filters, `task-tags.ts` |
| B6 (`meta.linkType`) | `extensions/org-image/index.ts`, `org-inline-markup/index.ts` widget `satisfied` |
| D1/D2 (heading title, priority) | `org-title-parser.ts`, `task-priority.ts`, agenda titles |
| D4 (src block `language`) | `org-editor/parser/parser.ts:109` nested-language highlighting, `org-src-block` |
| D5 (keyword token boundaries) | `org-keyword-overlay`, `rendering.ts` |

## Wire names

Rust serializes `StrikeThrough` as `crossed` and keeps the TS names for every shared node type. Every TS node type exists in Rust. The 18 Rust-only types (`paragraph`, `drawer`, `lineBreak`, `verseBlock`, footnotes, `subscript`/`superscript` and others) are new `NodeType` members. Every `NodeType`-keyed registry and switch must tolerate them, and `paragraph` must not hide nodes from widgets that look for direct children of `section` or `root`.
