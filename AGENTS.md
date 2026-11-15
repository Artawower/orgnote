# OrgNote

Note-taking ecosystem compatible with Emacs Org mode and Org-roam: web, mobile, desktop and CLI.

## Repository

- Monorepo managed with jj. `orgnote-client` (Vue 3 + Quasar, Capacitor, Electron, SSR), `orgnote-api` (shared TypeScript API and models), `orgnote-cli` (Commander + Axios) and `orgnote-backend` (Go, MongoDB, S3 storage, `just`) are plain directories.
- `org-mode-ast` and `rust-org-mode-ast` are separate ignored repositories kept for reference; changes to them belong to their own repositories.
- Bun is the package manager and script runner. Run `bun install` once at the root: `orgnote-api`, `orgnote-client` and `orgnote-cli` are Bun workspaces. Existing scripts and CI steps that call `npm` stay as they are; new ones use Bun.
- Client and CLI consume `orgnote-api` via `workspace:*` from its `dist`. After changing `orgnote-api`, run `bun run build` in it before typechecking, testing or running consumers.
- Backend tasks (lint, test, local stack) are `just` recipes in `orgnote-backend/justfile`.

## Docs

- `docs/file-synchronization.md` — sync mechanism across client, api, backend and cli. Read before any sync-related task.
- `docs/plans/` — plans for complex work. Check for an existing plan first; create new ones as `docs/plans/<descriptive-name>.md`; mark finished ones `**Status: COMPLETED**`.
- `docs/plans/tasks.org` — task backlog. Its header holds the agent protocol; read it before taking a task from there.
- When the `qmd` MCP server is available, search it before architecture or convention decisions. When docs and code disagree, say so instead of picking one silently.

## Before implementing

Reuse before writing: search for existing work that already solves the task or part of it, and extend it instead of building a parallel version. Look in:

- `orgnote-api/src/utils/`, `orgnote-client/src/utils/` and `orgnote-client/src/composables/` for helpers;
- `orgnote-client/src/components/` and `orgnote-client/src/containers/` for UI;
- registered commands and stores exposed in `orgnote-client/src/boot/api.ts`;
- `docs/plans/` and `docs/plans/tasks.org` for planned or in-progress work on the same thing.

Name what you found and reused, or state that nothing fitted.

## Code style

- Design by SOLID, KISS, DRY and YAGNI: one responsibility per function and module, the simplest solution that meets the task, one source of truth per piece of logic, nothing speculative.
- English for code, identifiers, docs and commit messages.
- Small pure functions: target ≤20 lines (hard limit 30), nesting depth ≤1, ≤3 parameters (use an options object beyond that). Files target ≤200 lines.
- Prefer guard clauses and early returns over `else`, lookup objects over `switch`, array methods over `while`; use the plain construct only when it is clearly simpler or measurably faster.
- Self-documenting names instead of comments. Comments only explain a non-obvious "why"; JSDoc only on public API.
- Named constants instead of magic values (`SCREAMING_SNAKE_CASE` for exported constants).
- TypeScript strict mode; `unknown` + type guards instead of `any`. Prefer `undefined` over `null`.
- Import shared helpers as `import { to, isPresent, isNullable } from 'orgnote-api/utils'`.
- Null checks go through `isPresent` / `isNullable`; client ESLint rejects `== null` comparisons.
- Recoverable errors use the `to(...)` Result pattern instead of `try/catch`; give it a message when the failure crosses module boundaries:

  ```ts
  const result = await to(fileSystem.writeFile, 'Failed to save note')(path, content);
  if (result.isErr()) return handle(result.error);
  ```

- Every error is handled, logged or re-thrown; never swallow it silently.
- Recursive `org-mode-ast` traversal uses `walkTree` from `org-mode-ast` (true tree walks: `title` → `section` → `children`). Flat iteration over `node.childrenList` stays a plain array method.
- Do not disable ESLint rules without explicit approval.

## Tests (Vitest)

- Flat `test(...)` calls only, no `describe` / `it`. Test names start with the entity under test: `test('getFileContent returns empty string when file is missing', ...)`.
- Test public behaviour; cover positive, negative, edge and error cases. When a test exposes a bug, fix the code, not the test.
- Use fake data only. Real notes and personal data are never committed, in fixtures or anywhere else.

## Client architecture (`orgnote-client`)

- Plugin-first: functionality an extension could need is exposed through `orgnote-api` and wired in `orgnote-client/src/boot/api.ts`. Check that contract before adding a feature.
- Feature code, components and extensions access stores through the `api` object (`api.core.useFileManager()`, `api.core.useSettings()`, `api.ui.useModal()`). Direct `src/stores/*` imports are for boot modules (`orgnote-client/src/boot/`) and store-to-store dependencies; new stores are created in `orgnote-client/src/stores/` and exposed via `boot/api.ts`.
- Extensions implement `Extension` (`orgnote-api/src/models/extension.ts`) with `onMounted` / `onUnmounted`; register user actions with `api.core.useCommands().add(...)`.
- File operations go through `api.core.useFileSystem()` / `useFileSystemManager()`; users can plug in their own filesystem, so never instantiate a concrete one.
- Code must work on PWA, Android, iOS, Electron and SSR, offline first. Gate platform-specific code with helpers from `orgnote-client/src/utils/platform-specific.ts` (`clientOnly`, `serverOnly`, `mobileOnly`, `androidOnly`, `iosOnly`, `nativeMobileOnly`, …).
- Keep the UI thread unblocked: run heavy computation (parsing, sync) in workers (`api.core.useWorkers()`) or split it into chunks that yield control; `useQueue()` only orders tasks, its handlers still run on the main thread. Virtualize large lists.
- OpenPGP encryption is optional and disabled by default (`orgnote-api/src/encryption/`, client store `orgnote-client/src/stores/encryption.ts`); its settings are part of the OrgNote config. No telemetry; mask file paths and user ids in logs.

## Client UI (`orgnote-client`)

- Mobile first: design for small screens, then enhance with Quasar breakpoints (`$q.screen.lt.md`). Account for safe areas and touch targets.
- Use project wrappers from `src/components/` and `src/containers/` instead of raw Quasar or native elements. If a reusable wrapper is missing, create it.

  | Need | Use |
  |---|---|
  | Icon | `AppIcon` |
  | Button | `AppButton`, `ActionButton`, `CommandActionButton` |
  | Text input | `AppInput`, `InputField` |
  | Multiline text | `AppTextArea`; Org syntax → CodeMirror wrapper in `containers/SourceCodeEditor/` |
  | Date | `AppDatePicker` |
  | Badge / Org tags | `AppBadge` / `OrgTags` |
  | Popover, context menu | `ContextMenu` |
  | Flex layout | `AppFlex` |
  | File / directory picker in extension settings | valibot `metadata({ filePicker: true })` / `metadata({ directoryPicker: true })` on `SettingsItem` |
  | Quick search / selection | `api.core.useCompletion().open(...)` |
  | Notification | `api.core.useNotifications()` |

- User-facing actions are commands triggered from UI via `CommandActionButton` or the completion menu, not click handlers with business logic.
- Styles: scoped `<style>` with nested selectors and semantic class names (`.toolbar`, `.chip`); no BEM. Values come from design tokens in `src/css/variables.scss` (reference: `VARIABLES.org`) and mixins in `src/css/mixins.scss`, never hardcoded.
- i18n: keys live in `orgnote-api/src/constants/i18n-keys.ts`; use `useI18n().t(...)`.
- CodeMirror block widgets (`WidgetType` with `Decoration.replace({ block: true })`) must set `contenteditable="false"` on the root element from `toDOM()`, otherwise clicks inside throw `RangeError: Invalid child in posBefore`. Reference: `src/containers/RichEditor/widgets/org-multiline-widget.ts`.

## Workflow

- Commits follow Conventional Commits: `<type>(<scope>): <subject>`, imperative, lowercase, ≤50 chars. Scopes: `client`, `api`, `cli`, `backend`, or cross-cutting `sync`, `core`, `deps`, `repo`. A change spanning several components is one logical change.
- Keep changes within the task; propose unrelated improvements instead of making them.
- Before committing, run the checks CI runs for every affected workspace. A change in `orgnote-api` also affects its consumers (`orgnote-client`, `orgnote-cli`), even when their files are untouched:

  | Workspace | Checks |
  |---|---|
  | `orgnote-api` | `bun run lint`, `bun run test:ci`, `bun run prepub`, `bun pm pack --dry-run` |
  | `orgnote-client` | `bunx quasar prepare`, then `bun run lint`, `bunx vue-tsc --noEmit`, `bun run test:ci`; for SSR-sensitive changes also `bun run build -m ssr` and start `dist/ssr` (CI health-checks `localhost:3000`) |
  | `orgnote-cli` | `bunx tsc --noEmit -p .`, `bun run test --run`, `bun run build` |
  | `orgnote-backend` | `golangci-lint run`, `go build ./app/main.go`, `go test -race ./...` |

- The diff holds no `console.log`, `debugger`, TODOs, secrets or unrelated changes. Ask for approval before every commit and push.
- Never print secrets, `.env` values or personal data; mask them.
