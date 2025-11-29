# Code Hygiene Reference

This document provides a complete reference for all code quality and hygiene mechanisms in this repository.

---

## What Runs Locally (Pre-Commit)

These checks run automatically on every commit via `scripts/pre-commit.sh`. **All checks block the commit if they fail.**

| Check | What it Does | Triggers On |
|-------|--------------|-------------|
| **ESLint** | Checks and auto-fixes code quality issues | `.ts`, `.tsx`, `.js`, `.jsx` files |
| **Prettier** | Enforces consistent code style | Code + `.json`, `.css`, `.md` files |
| **Unit Tests (Frontend)** | Runs frontend unit tests | `packages/frontend/{src/**,vitest.unit.config.ts,package.json}` or root deps |
| **Unit Tests (DSP)** | Runs DSP unit tests | `packages/dsp/**/*.{js,ts}`, config, or root deps |
| **Integration Tests** | Runs integration tests | `tests/**`, `vitest.integration.config.ts`, or root deps |
| **Semgrep**† | Security vulnerability scan | Code files (requires Docker) |
| **Native Build**† | Builds C++ plugin | `native/**` or root deps |
| **Code Review** | Claude Code hook for security & quality | All code files (Claude Code only) |

†**Note:** Semgrep and native build can take >30 seconds. If these slow down your workflow, they can be skipped locally and will still run in CI. Use `SKIP_PRE_COMMIT=1` for the commit, then let CI catch any issues.

### How It Works

1. You run `git commit`
2. `simple-git-hooks` triggers `scripts/pre-commit.sh`
3. **Sequential**: ESLint and Prettier run first (auto-fix and re-stage)
4. **Parallel**: Tests, Semgrep, and native build run concurrently
5. **If Claude Code**: Code review hook also runs (security + quality checks)
6. Commit proceeds only if all checks pass

### Path Filtering

The pre-commit script uses the same path filtering as CI - checks only run when relevant files are staged:

- Frontend tests: `packages/frontend/src/**`, `packages/frontend/vitest.unit.config.ts`, `packages/frontend/package.json`
- DSP tests: `packages/dsp/**/*.{js,ts}`, `packages/dsp/vitest.unit.config.ts`, `packages/dsp/package.json`
- Integration tests: `tests/**`, `vitest.integration.config.ts`
- Native build: `native/**`
- All checks: Also trigger on root `package.json` or `pnpm-lock.yaml` changes

### Skipping (Emergencies Only)

```bash
SKIP_PRE_COMMIT=1 git commit -m "message"     # Skip all pre-commit checks
SKIP_CODE_REVIEW=1 git commit -m "message"    # Skip Claude Code review only
```

---

## What Runs in CI

These checks run on every PR. **All checks block the PR from merging if they fail.**

| Check | Workflow | Triggers On |
|-------|----------|-------------|
| **Unit Tests (Frontend)** | `test.yml` | `packages/frontend/src/**`, `package.json` |
| **Unit Tests (DSP)** | `test.yml` | `packages/dsp/**`, `package.json` |
| **Integration Tests** | `test.yml` | DSP files, `tests/**`, `package.json` |
| **Coverage (95%)** | `test.yml` | TypeScript files must have 95% coverage |
| **Security Scan** | `semgrep.yml` | `.ts`, `.tsx`, `.js`, `.jsx`, `.cpp`, `.h` |
| **Native Build** | `main.yml` | `native/**`, `package.json`, `pnpm-lock.yaml` |
| **PR Monitor** | `pr-monitor.yml` | All PRs (aggregates all check results) |

### Required Check

**PR Monitor (`Check Commit Status`)** is the only required check for merging. It waits for all other workflows and reports aggregate pass/fail.

---

## Quick Reference

| What | Command | When |
|------|---------|------|
| Lint code | `pnpm run lint` | Before committing |
| Fix lint issues | `pnpm run lint:fix` | When lint fails |
| Check formatting | `pnpm run format:check` | Before committing |
| Format code | `pnpm run format` | When format check fails |
| Run unit tests | `pnpm run test:unit` | Before pushing |
| Run integration tests | `pnpm run test:integration` | Before pushing |
| Full build | `pnpm run build` | Before pushing native changes |
| Security scan | `pnpm run semgrep` | Optional locally (requires Docker), required in CI |

---

## Pre-Commit Hook Details

### Main Pre-Commit Script (All Developers)

The script `scripts/pre-commit.sh` runs the same checks as CI locally:

**Step 1 - Lint & Format (Sequential):**
- ESLint checks and auto-fixes staged code files
- Prettier formats all staged files
- Fixed files are automatically re-staged

**Step 2 - Tests & Security (Parallel):**
- Unit tests run if relevant source files changed
- Integration tests run if DSP or test files changed
- Semgrep runs if Docker is available
- Native build runs if native code changed

Install hooks (first time or after `pnpm install`):
```bash
pnpm run prepare
```

### Claude Code Review (Claude Code Only)

When Claude Code executes `git commit`, an additional hook reviews staged changes.

**Blocking issues (commit fails):**
- Hardcoded secrets/credentials (passwords, API keys, AWS keys)
- `eval()` usage (code injection risk)
- `innerHTML` assignment (XSS vulnerability)
- `dangerouslySetInnerHTML` usage
- Shell command injection patterns
- SQL injection patterns

**Warnings (commit proceeds):**

*Code quality:*
- `console.log()` in non-test files
- TODO/FIXME comments
- eslint-disable comments
- `@ts-ignore` usage
- Large changes (500+ lines)

*Code hygiene:*
- Missing `.js` extension in local imports
- Node.js built-ins without `node:` protocol
- New JavaScript files (should be TypeScript)
- Default exports (prefer named)
- npm usage (should use pnpm)
- Unit tests in `tests/` (should be colocated)

**Configuration:** `.claude/settings.json`, `.claude/hooks/pre-commit-review.sh`

## Linting (ESLint)

ESLint checks for code quality issues and potential bugs.

### Configuration

- **Config file:** `eslint.config.js` (flat config format)
- **Version:** 9.x

### Key Rules

| Rule | Setting | Description |
|------|---------|-------------|
| `@typescript-eslint/no-unused-vars` | error | Unused vars (prefix with `_` to ignore) |
| `@typescript-eslint/no-explicit-any` | warn | Warns on `any` type usage |
| `curly` | error | Requires braces for all control statements |
| `semi` | error | Requires semicolons |

### Commands

```bash
# Check all files
pnpm run lint

# Auto-fix issues
pnpm run lint:fix
```

### Ignored Paths

- `node_modules/`
- `dist/`, `**/dist/`
- `native/`
- `public/`, `**/public/`
- `.worktrees/`
- `.wireit/`
- `.devcontainer/`

## Formatting (Prettier)

Prettier enforces consistent code style.

### Configuration

**`.prettierrc`:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

### Commands

```bash
# Check formatting (CI-safe, no changes)
pnpm run format:check

# Format all files
pnpm run format
```

### Ignored Paths

See `.prettierignore`:
- `node_modules`
- `dist`
- `native`
- `public`
- `pnpm-lock.yaml`
- `.devcontainer`

## Static Analysis (Semgrep)

Semgrep provides security-focused static analysis with 1000+ rules covering OWASP vulnerabilities.

### Run Locally

Requires Docker:

```bash
pnpm run semgrep
```

This runs the Semgrep Docker image with the `auto` config, which includes security rules for JavaScript, TypeScript, and C++.

### CI Integration

Semgrep runs automatically on PRs that modify code files (`.ts`, `.tsx`, `.js`, `.jsx`, `.cpp`, `.h`). Results appear as check annotations.

## Testing

### Unit Tests

```bash
# Run unit tests
pnpm run test:unit

# Run with coverage
pnpm run test:unit:coverage
```

**Configuration:**
- Frontend: `packages/frontend/vitest.unit.config.ts`
- DSP: `packages/dsp/vitest.unit.config.ts`

**Test Location:** Colocated with source files (e.g., `foo.test.ts` next to `foo.ts`)

**Coverage Requirements:**
- 95% coverage threshold for TypeScript files
- Per-file enforcement (each `.ts` file must meet the threshold)
- JavaScript files are exempt from coverage requirements

### Integration Tests

```bash
pnpm run test:integration
```

**Configuration:** `vitest.integration.config.ts`

**Test Location:** `tests/**/*.test.ts`

**Current Tests:**
- `audio-processing.test.ts` - DSP audio processing verification
- `volume-knob.test.ts` - Volume knob parameter handling

## Build System (Wireit)

Wireit provides incremental builds with file watching.

### Available Tasks

| Task | Description |
|------|-------------|
| `build` | Full build (DSP → UI → Native) |
| `build-dsp` | Build DSP package |
| `build-ui` | Build frontend |
| `build-native` | Build C++ plugin |
| `test:integration` | Run tests |

### Incremental Builds

Wireit tracks input/output files. Re-running a task with no changes is instant:

```bash
pnpm run build  # First run: full build
pnpm run build  # Second run: skipped (no changes)
```

## Troubleshooting

### Pre-commit hook not running

```bash
pnpm run prepare
```

### ESLint not finding files

Ensure you're not in an ignored directory. Check `eslint.config.js` ignores.

### Prettier formatting differs from ESLint

Both tools are configured to be compatible via `eslint-config-prettier`. If conflicts occur, Prettier takes precedence (it runs second in the pre-commit script).

### Coverage threshold failures

If coverage is below 95% for a TypeScript file:
1. Check which file failed in the error output
2. Add tests to cover the missing lines/branches
3. Coverage only applies to `.ts` files - JavaScript is exempt

### Tests timing out

Integration tests have a 60-second timeout. If tests are slow, check for:
- Missing dependencies (`pnpm install`)
- Build issues (run `pnpm run build` first for native tests)

### Semgrep not running locally

Semgrep requires Docker. If Docker is not available, the pre-commit hook will skip Semgrep with a warning. Install Docker to run security scans locally.

## Package Scripts Reference

| Script | Description |
|--------|-------------|
| `dev` | Start development server |
| `build` | Full production build |
| `lint` | ESLint check |
| `lint:fix` | ESLint auto-fix |
| `format` | Prettier format |
| `format:check` | Prettier check |
| `test:unit` | Run unit tests |
| `test:unit:coverage` | Run unit tests with coverage |
| `test:integration` | Run integration tests |
| `semgrep` | Run Semgrep security analysis (requires Docker) |
| `prepare` | Install git hooks |
| `clean` | Remove build artifacts |
