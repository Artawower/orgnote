# Replace org-mode-ast with the Rust parser

**Status: PLANNED**  
**Created: 2026-11-12**  
**Scope:** Rust core, WASM package, shared API, client editor and parser consumers.

## Goal and milestones

Replace the TypeScript parser without losing note content, editor operations, metadata or platform support. Make editor parsing cooperative so an edit does not require one uninterrupted full-document parse.

- **M1 — Correct core:** lossless source representation, safe recovery and verified public contracts.
- **M2 — Replacement:** compatible API, supported runtime initialization and cooperative CodeMirror integration; the old engine can be disabled.
- **M3 — Incremental edits:** reuse unchanged regions after edits. This is separate from M2 and must not be claimed as implemented by a resumable `advance()` loop.

The baseline is the current TS behavior plus explicitly approved correctness improvements. Preserve useful behavior, not known TS bugs. New syntax coverage is not a substitute for compatibility.

## Existing work to reuse

Paths below are relative to the monorepo root. The two parser directories are separate ignored repositories; implement and validate their changes in their own repositories.

| Existing work | Reuse |
| --- | --- |
| [Original Rust migration plan](../../rust-org-mode-ast/docs/plans/rust-migration.md) | Arena, handlers, WASM bindings and existing phases; update its completion claim when implementing this plan. |
| [Agenda lag investigation](../plans/agenda-lag-root-cause.md) | CLOCK scaling cases and the requirement to avoid repeated full parses on the UI thread. |
| [Org editor API plan](../plans/orgnote-api-org-editor.md) and `orgnote-api/src/utils/org-edit/` | Existing document operations and their integration tests. |
| `org-mode-ast/src/parser/`, `src/models/`, `src/tree-walker/` tests | Historical regressions, mutable AST behavior, metadata and traversal contracts. |
| `rust-org-mode-ast/tests/`, `scripts/validate_complex.mjs`, `scripts/smoke_wasm.mjs` | Extend the current suites and comparison driver instead of adding another competing harness. |
| `orgnote-client/src/utils/org-editor/parser/` | Replace the existing language adapter while preserving highlighting, folding and nested languages. |
| `orgnote-client/src/workers/`, `src/stores/worker.ts`, `orgnote-api/src/models/worker-store.ts` | Existing worker lifecycle and RPC; client features access it through `api.core.useWorkers()`. |

The original plan says “RUST CORE COMPLETE — CLIENT INTEGRATION PENDING”. The findings below contradict that claim: core correctness work remains. `CONTEXT.md` also needs alignment with public UTF-16 ranges and the actual wire names.

## Current capabilities and missing guarantees

Rust retains tokenizer, parse context and arena between calls. WASM `advance()` processes up to 256 dispatch iterations. `stop_at()` uses UTF-16 positions; `clear_stop_at()` permits continuation before finalization. The constructor receives the whole source; feeding source chunks is not supported.

The client still calls `withMetaInfo(parse(doc))` synchronously inside `createParse()`. Its `advance()` only builds a CodeMirror tree and `stopAt()` does nothing. There is no Rust integration or reuse of `TreeFragment` in this path.

Fixed token counts do not bound execution time: a complete line is tokenized before dispatch, and some constructs scan ahead. Finalization, metadata, serialization, hydration and CodeMirror conversion are additional work. Moving only token dispatch into slices is insufficient.

## Confirmed blockers

These examples were reproduced with the existing local WASM package and their causes inspected in current source. Reproduce them on a fresh build before fixing; the previous audit could not rebuild Rust because the local Cargo cache lacked `aho-corasick 1.1.4`.

| ID | Problem and reproduction | Impact / relevant files |
| --- | --- | --- |
| B1 | `* H :работа:\n`, `<a😀aaaaaaaaa>` and `parse_org_timestamp("<2026-11-12 Thu +1д>")` trap. | UTF-8 byte slicing can panic on valid tags or incomplete input. Rust `handlers/headline.rs`, `handlers/date.rs`, `meta/timestamp.rs`. |
| B2 | PROPERTIES nodes retain normalized key/value fields but omit source markers, whitespace and leaf text. | Existing `rawValue` and property mutations cannot reconstruct the document. Rust `handlers/property.rs`, `handlers/drawer.rs`; API `org-edit/features/properties.ts`. |
| B3 | `https://example.invalid/path.\n` loses the trailing period from the AST. | Trimming the URL consumes a whole token without preserving its remainder. Rust `parser/parser.rs::try_raw_link`. |
| B4 | Indented property drawers lose `id` metadata; CLOCK inside LOGBOOK loses `date`/`to`, although CLOCK outside a drawer works. | Historical TS behavior regresses through interactions between routing contexts. Rust `route_planning_drawer_token`, drawer handling and metadata collectors. |
| B5 | `:a:b:` is not recognized as tags; repeated FILETAGS overwrite instead of accumulating. | Missing tags and changed filtering/indexing results. Rust `handlers/headline.rs`, `meta/collectors.rs`. |
| B6 | Link DTOs omit per-node `meta.linkType`. | Current image widgets select by this field. Rust node/JSON contract; client `extensions/org-image/index.ts`. |
| B7 | After parsing `* Task\nbody\n`, metadata before `finalize()` reports heading end `2` instead of `12`; finalization leaves the cached metadata stale. | Public lifecycle permits incorrect ranges. Rust `lib.rs`, parser finalization and metadata collection. |
| B8 | `walk_tree_flat()` visits title through both `title` and `children`. | Duplicate nodes and inconsistent traversal; JSON serialization already excludes these duplicates. Rust `lib.rs`, `types/arena.rs`, `tools/json.rs`. |
| B9 | `SCHEDULED: DEADLINE: <2026-11-12 Thu>` assigns the date to both fields. | Recovery can invent a scheduled date. Collector must stop searching at the next planning keyword or line boundary. Rust `meta/collectors.rs`. |
| B10 | `first\n \nsecond\n` becomes one Paragraph. | New Paragraph behavior misses whitespace-only blank lines. Rust `parser/paragraph.rs`. |
| B11 | The compatibility script compares TS output with stored Rust snapshots, tolerates up to 25% node-count difference and ignores most values/ranges/metadata. | Passing comparisons do not establish replacement readiness. Rust `scripts/validate_complex.mjs`. |

The later TS CLOCK optimization (`fab1ebb`, jj `nmmnyqqu`) and current `OrgChildrenList.removeNodes` work should contribute regression cases, not literal Rust ports: direct arena construction avoids their linked-list rewrapping mechanism. TS `setLevel()`, public timestamp parsing and heading attributes must remain usable through the replacement API.

## Architecture options

Ratings are qualitative judgments for this migration, not benchmark results.

| Option | Approach | Adversarial assessment | Fit |
| --- | --- | --- | --- |
| A | Keep Rust parsing and a lossless DTO; hydrate the existing TS node contract behind one API facade. | Lowest caller churn, but hydration can recreate expensive position updates. Requires bulk attachment, complete source fidelity and contract tests. | **Best for M2** |
| B | Use immutable source-backed Rust results and perform editing through validated text patches. | Avoids mutable hydration overhead, but changes existing `OrgNode` consumers and mutation semantics; conflict detection and exact formatting become explicit responsibilities. | Promising later; larger migration |
| C | Keep the full AST engine for metadata/edits and introduce a separate incremental Lezer grammar for the editor. | Supports editor-specific reuse, but creates two grammars and disagreement between widgets, indexing and editing. | Weak fit for replacing the old parser |

**Recommendation:** A for M2. Preserve source syntax in the Rust representation and hydrate through a dedicated bulk constructor; do not rebuild parsed nodes through ordinary mutation methods that repeatedly shift positions. Validate this path early. If it fails the performance gate, revisit B before broad caller migration. Avoid a second grammar.

## Implementation sequence

### P0 — Pin the contract and make comparisons meaningful

**Depends on:** nothing. **Repositories:** both parsers and OrgNote.

- Record exact baseline revisions and dependency versions. Separate committed TS fixes from the current working-copy changes; do not silently publish or treat uncommitted work as a released baseline.
- Inventory actual consumer use of `OrgNode`, `OrgChildrenList`, traversal, metadata, configuration, diff and timestamp exports across API, client, CLI and extension contracts.
- Define expected output for each blocker above and approved differences: Paragraph wrappers, new constructs, clean heading titles, optional fields and wire names. Rust `StrikeThrough` currently serializes as `crossed`; do not introduce an accidental wire rename.
- Extend `validate_complex.mjs` to run both live engines. Compare source fidelity, ranges, values, hierarchy, properties and metadata, normalizing only listed intentional differences.
- Extract a small synthetic corpus with provenance into versioned fixtures. CI must obtain a pinned TS baseline or its reviewed expectations without requiring ignored sibling checkouts. Stored Rust snapshots alone are not the oracle.

**Acceptance:** the driver fails on the known regressions, reports exact differences and baseline versions, and runs in a clean CI checkout. There are no percentage tolerances or silently skipped required cases.

### P1 — Fix source fidelity and context recovery

**Depends on:** P0. **Repository:** Rust parser.

- Fix B1–B5, B9 and B10 with regression tests first. Preserve markers, spacing, CRLF/LF, URL suffixes and incomplete syntax in a lossless tree; semantic properties are derived data.
- Test CLOCK inside LOGBOOK, dates next to planning keywords, indented drawers, property EOF, tags after priority/markup and nested lists containing blocks.
- Audit UTF-8 indexing beyond the three known failures. Validate configuration at the public boundary; invalid regex configuration must return an actionable error rather than silently disable links.
- Add generated Unicode/malformed-input cases and character-by-character typing/deletion tests. Check ordered, contained UTF-16 ranges and exact raw reconstruction, including empty input and missing final newline.
- Extract context-routing helpers only where required to make these fixes independent; preserve arena storage and direct CLOCK construction.

**Acceptance:** native and freshly built WASM pass the corpus; parsing never traps on generated editor input; unedited round-trips are exact; no note data enters fixtures.

### P2 — Stabilize lifecycle, traversal and metadata

**Depends on:** P1. **Repository:** Rust parser.

- Fix B6–B8. Share one traversal rule: title, section, remaining children, each reachable node once.
- Make EOF, stopped parse, finalization and disposal explicit states. Full metadata must either finalize a completed parse itself or reject an unfinalized state; cached metadata must never survive a range-changing pass unchanged.
- Define terminal behavior after partial finalization and reject unsupported continuation. Retain stop/resume before finalization and idempotent finalization.
- Verify full-parse versus sliced-parse equivalence with many slice sizes and stop positions, including emoji, incomplete constructs and repeated stops. Keep shallow metadata separate from complete-document metadata.
- Align generated/public TS types with actual DTOs, including per-node metadata, nullability, configuration and timestamp/diff results. Surface serialization errors instead of returning a typed-looking null.

**Acceptance:** B7 returns heading end `12` or an explicit lifecycle error; traversal contains no duplicates; supported call sequences and invalid transitions are tested through the WASM boundary.

### P3 — Prove packaging, initialization and API compatibility

**Depends on:** P2. **Repositories:** Rust parser, API and consumers.

- Extend existing WASM build/smoke scripts to test web, bundler and Node artifacts, package names, included assets and exported types. Test a packed package in a clean consumer rather than relying on local `pkg` files.
- Introduce one parser facade in `orgnote-api/src/parser/` and expose its public surface. Preserve sync parse/edit signatures after explicit async runtime initialization at application/CLI startup; handle calls before readiness explicitly.
- Keep WASM initialization local to each runtime/worker. Shared imports must be safe in SSR and Node without browser globals. Verify offline asset loading in PWA, Electron and Capacitor.
- Add lossless DTO hydration with bulk parent/sibling linking, properties, per-node metadata, title/section, `rawValue`, `cleanValue` and existing mutation behavior. Ordinary `new OrgNode(dto)` is not a sufficient hydration implementation.
- Run existing `org-edit` suites through the facade, including `setLevel`, scheduling, repeaters, properties, LOGBOOK and task creation. Preserve extension-facing AST and command contracts; wire new client-facing capabilities through `boot/api.ts` where needed.

**Acceptance:** existing operations produce equivalent text and shifted ranges after edits; public type checks pass; initialization and packaged WASM loading work across target runtimes; parse-plus-hydration scaling does not recreate the old CLOCK regression.

### P4 — Connect cooperative parsing to CodeMirror

**Depends on:** P2 and P3. **Repository:** client, with bounded-work changes in Rust as needed.

- Replace eager parsing in `src/utils/org-editor/parser/parser.ts` with a persistent Rust session per document version. `createParse()` must not complete the full parse; `advance()` returns null until a tree is available.
- Implement actual `parsedPos`, `stopAt` and nullable `stoppedAt` semantics from the installed Lezer contract. Account for `ranges`; document that `fragments` are intentionally unused until M3. Do not resume an already finalized partial session.
- Bound work inside tokenization/lookahead, not only dispatch count. Keep partial tree construction, finalization and CodeMirror conversion within measured budgets; avoid serializing the accumulated full AST after every slice.
- Keep the synchronous `PartialParse.advance()` contract: use cooperative local parsing for editor syntax. Use the existing worker API for full metadata/indexing and other heavy work; asynchronous worker results require a separate editor update path, not a Promise returned from `advance()`.
- Tag work by document version and configuration. Cancel superseded sessions, ignore stale completions and free WASM memory on replacement, error and editor disposal. Publish complete metadata only for the matching completed version.
- Preserve nested source-language parsing, folding, highlighting, widgets and contenteditable behavior. Test edits arriving during a partial parse and viewport expansion after a stopped parse.

**Acceptance:** typing can yield and paint before full parsing completes; viewport stopping works; old-version results never overwrite current state; repeated editing/disposal does not leak sessions; nested language and widget tests pass.

### P5 — Measure the complete path and switch consumers

**Depends on:** P3 and P4. **Repositories:** API, client and CLI.

- Benchmark fresh release WASM against the pinned TS baseline: 100/200/400 CLOCKs in one LOGBOOK, many small LOGBOOKs, nested headings/lists, Unicode, tables and single long lines. Include cold startup and repeated edits.
- Measure tokenization, parse, finalization, metadata, serialization, hydration, CodeMirror conversion, worker transfer and paint separately. Track p95 UI task duration, end-to-end latency, allocations and retained WASM memory on a recorded desktop and mobile device.
- Use an initial 8 ms p95 budget for cooperative parse/conversion tasks on the recorded devices, with no parser-related 50 ms main-thread task in the benchmark corpus. Treat these as acceptance targets to validate, not existing guarantees; change targets only with recorded evidence and an explicit decision.
- Remove avoidable duplicate full parses of one document version in affected paths. Share immutable results or metadata where useful; never share mutable editing trees across consumers.
- Migrate direct imports through the facade, including parsing in encryption and indexing paths. Resolve differing parser dependency versions in API/client/CLI. Keep the switch reversible during validation and the old engine available until the gate passes.
- Test offline PWA, Android, iOS, Electron, SSR and CLI startup. Add an SSR build/server health check. Platform branches use existing platform helpers.

**Acceptance:** correctness and performance gates pass; affected runtime paths use the selected engine; disabling the TS engine does not break startup, edits, rendering, metadata or CLI consumers. Roll back on any trap, source loss, stale result or material performance regression.

### P6 — Reuse unchanged regions after edits

**Depends on:** M2/P5. **Repositories:** Rust parser and client.

- Design restartable context checkpoints and dependency boundaries for headings, blocks, drawers, lists, configuration and metadata. Identify when a local edit must invalidate the remainder of the document.
- Choose one reuse mechanism: Rust-owned reusable subtrees exposed through the adapter, or a Lezer fragment integration backed by equivalent parser state. Reuse must account for shifted positions and changed context, not just unchanged text.
- Compare incremental results with a fresh full parse after generated edit sequences. Cover edits that open/close a block or change heading/list nesting.

**Acceptance:** results equal a full parse after every tested edit; representative local edits demonstrably reuse unchanged regions; invalidation remains correct for edits with document-wide effects. Until then, describe the parser as cooperative, not incremental across edits.

## Validation and completion gates

- **Rust repository:** `cargo test`, `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features -- -D warnings`, fresh WASM smoke tests, live compatibility comparisons and release benchmarks. Newly added tests in OrgNote use flat `test(...)` calls.
- **API:** `bun run lint`, `bun run test:ci`, `bun run prepub`, `bun pm pack --dry-run`. Build API before checking consumers.
- **Client:** `bunx quasar prepare`, `bun run lint`, `bunx vue-tsc --noEmit`, `bun run test:ci`, `bun run build -m ssr` and a running SSR health check on port 3000, plus the platform/performance cases above.
- **CLI:** `bunx tsc --noEmit -p .`, `bun run test --run`, `bun run build`, plus packaged parser initialization smoke coverage.
- Complete M2 only when B1–B11 are resolved, contract tests and target-runtime checks pass, and the application works with the old engine disabled. Remove the old dependency only after this gate; track externally published extensions that still depend on its package identity.
- Update the original migration plan and domain context in the Rust repository. Mark this plan `**Status: COMPLETED**` only after all three milestones are completed, or explicitly split M3 into a linked follow-up plan before closing M2 work.

## Remaining decisions and evidence limits

- Bulk hydration is the recommended compatibility path, but its cost is unproven. P3 must validate it before migrating all consumers.
- The exact supported external-extension compatibility window requires an inventory; in-repository type checks cannot establish it.
- The audit's approximately 78 ms `advance()` on a synthetic 3-million-character line is evidence that dispatch limits are insufficient, not a release speed comparison. The TS audit passed 464 tests with 13 skipped, lint and type checks; Rust formatting passed, but native tests/clippy and a fresh WASM build were not verified.
- Existing TS clean heading-title behavior is imperfect; changes to that output need explicit expected values rather than automatic parity. Full Org specification coverage and source-chunk streaming are separate from replacement readiness.
