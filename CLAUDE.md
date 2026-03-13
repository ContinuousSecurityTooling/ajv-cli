# CLAUDE.md — Project Notes for Claude Code

## Project Overview

`@continuoussecuritytooling/ajv-cli` is a CLI wrapper around [Ajv](https://ajv.js.org/) JSON Schema validator. It compiles TypeScript sources to `dist/` and ships a Docker image (`node:24-slim` base). Commands: `validate`, `compile`, `test`, `migrate`, `help`.

## Commands

```bash
npm run build       # tsc → dist/
npm run test-spec   # mocha via ts-node (no lint, no coverage)
npm run test-cov    # mocha + nyc coverage
npm run test        # lint + test-cov
npm run lint        # eslint src/**/*.ts test/**/*.js
```

## Architecture

- Entry point: `src/index.ts` (CLI arg parsing via minimist)
- Commands: `src/commands/{validate,compile,test,migrate,help}.ts`
- Shared utilities: `src/commands/util.ts`, `src/commands/options.ts`, `src/commands/ajv.ts`
- Tests are **integration-only** (run compiled `dist/index.js` via `exec()`) EXCEPT for new unit tests in `test/util.spec.ts` and `test/options.spec.ts`

## Key Compatibility Notes

### Node.js v24

- `import X = require(...)` (TypeScript CommonJS compat syntax) is **not supported** by Node.js v22+ native strip-only mode. All test files use `import X from "..."` or `import * as X from "..."` instead.
- `String.prototype.substr` is deprecated — use `substring` (`src/commands/util.ts` already fixed).

### TypeScript 5.2+

**Required** — do not downgrade. Reason: `@types/node` v24 uses `typesVersions` to route TypeScript ≤5.6 to `ts5.6/index.d.ts`, which requires `lib: esnext.disposable` (added in TypeScript 5.2). On TypeScript 4.x this produces dozens of TS1165/TS2339 errors across `@types/node` declarations.

### `@types/node` v24

Required for Node.js 24 runtime types. Requires TypeScript ≥5.2 (see above).

**Gotcha — `assert.strictEqual` narrowing:** `@types/node` v24 gave `assert.strictEqual` an assertion signature:

```typescript
function strictEqual<T>(actual: unknown, expected: T, message?): asserts actual is T
```

This means TypeScript 5 narrows `actual` after a `strictEqual` call. If you call `assert.strictEqual(err.keyword, "typeof")` where `err` is typed as `DefinedError` (an ajv discriminated union that has no `"typeof"` member), TypeScript narrows `err` to `never`. Subsequent property accesses then fail with TS2339.

**Fix already applied:** `assertErrors()` in `test/validate.spec.ts` returns `ErrorObject[][]` instead of `DefinedError[][]`. Use `ErrorObject` (base interface, `keyword: string`) for tests involving custom keywords; `DefinedError` only covers built-in ajv keywords.

### ESLint Stack

The project upgraded from a mismatched stack (eslint v6, eslint-plugin-prettier v3, prettier v3) that broke because `prettier.resolveConfig.sync` was removed in prettier v3. Current working stack:

| Package | Version |
| --- | --- |
| eslint | ^8.0.0 |
| eslint-plugin-prettier | ^5.0.0 |
| eslint-config-prettier | ^10.0.0 |
| @typescript-eslint/eslint-plugin | ^5.0.0 |
| @typescript-eslint/parser | ^5.0.0 |
| prettier | ^3.8.1 |

**Gotcha — `@ajv-validator/config`:** The shared ESLint config (`@ajv-validator/config/.eslintrc`) still extends `"prettier/@typescript-eslint"`, which was merged into `"prettier"` in eslint-config-prettier v8. The `.eslintrc.js` override filters this out at runtime:

```js
extends: [...(tsConfig.extends || []).filter((e) => e !== "prettier/@typescript-eslint"), "prettier"],
```

Do **not** remove this filter until `@ajv-validator/config` is updated upstream.

**Disabled rules** (intentional — the codebase uses `any` for dynamic CLI/JSON data):

- `@typescript-eslint/no-unsafe-argument`
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-return`
- `@typescript-eslint/no-var-requires`

## Testing

- **Integration tests** use `dist/index.js` — always run `npm run build` before `npm run test-spec`.
- **Unit tests** (`test/util.spec.ts`, `test/options.spec.ts`) import source modules directly via ts-node; no build step needed.
- `process.exit()` is called on errors in `util.ts` (`openFile`, `compile`) — only test happy paths in unit tests.
- Coverage is healthy: ~97% statements, 100% functions.

## Renovate

ESLint-related packages are grouped in `renovate.json5` under `packageRules` (`groupName: "eslint"`) so they're always upgraded together, preventing the version mismatch that broke lint.

## CI / Docker

- `actions/checkout` and `actions/setup-node` must be **v4** — v5/v6 do not exist.
- Build matrix tests Node.js **22.x and 24.x**.
- `build-results` job depends on both `build` and `package` jobs so Docker failures block the branch.
- Docker base image: `node:24.14.0-slim`. The `dist/` folder must be built before `docker build` (the `package` job does `npm run clean && npm run build` first).

## CodeClimate Output Format

`--errors=code-climate` emits a JSON array of CodeClimate issues to **stdout** (for easy pipe/redirect to a file). Stderr still receives the `<file> invalid` message.

Each issue shape:

```json
{
  "description": "[schema] #/path/to/field must be ...",
  "check_name": "json-schema",
  "fingerprint": "<sha1 of filepath+instancePath+message>",
  "severity": "major",
  "location": { "path": "<filepath>", "lines": { "begin": 1 } }
}
```

GitLab CI usage: redirect stdout to `gl-code-quality-report.json` and declare it as a Code Quality artifact.

> **Note:** The fork at `jirutka/ajv-cli` also tracks exact line/column positions by parsing JSON/YAML with position metadata. Our implementation omits this (always `lines.begin: 1`) to avoid heavy dependencies — the GitLab Code Quality widget works without positions.

## js-yaml Note

The project uses `js-yaml` v3 (`^3.14.0`). `yaml.safeLoad` is still the primary API in v3 and is **not** deprecated there. If `js-yaml` is ever upgraded to v4, `safeLoad` must be replaced with `load` (same arguments, different function name).
