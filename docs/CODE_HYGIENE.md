# Code Hygiene Reference

This document provides a complete reference for all code quality and hygiene mechanisms in this repository.

---

## What Runs Locally (Pre-Commit)

These checks run automatically on every commit. **All checks block the commit if they fail.**

| Check | Tool | What it Does |
|-------|------|--------------|
| **Linting** | ESLint via lint-staged | Checks and auto-fixes code quality issues |
| **Formatting** | Prettier via lint-staged | Enforces consistent code style |
| **Security Review** | Claude Code hook | Blocks commits with security vulnerabilities |

### How It Works

1. You run `git commit`
2. `simple-git-hooks` triggers `lint-staged`
3. ESLint runs on staged `.ts`, `.tsx`, `.js`, `.jsx` files (auto-fixes applied)
4. Prettier formats all staged files
5. **If Claude Code**: Security review hook runs, blocks on vulnerabilities
6. Commit proceeds only if all checks pass

### Skipping (Emergencies Only)

```bash
SKIP_SIMPLE_GIT_HOOKS=1 git commit -m "message"  # Skip lint-staged
SKIP_CODE_REVIEW=1 git commit -m "message"       # Skip Claude security review
```

---

## What Runs in CI

These checks run on every PR. **All checks block the PR from merging if they fail.**

| Check | Workflow | Triggers On |
|-------|----------|-------------|
| **Unit Tests** | `test.yml` | Changes to `packages/frontend/src/**`, `packages/dsp/**` |
| **Integration Tests** | `test.yml` | Changes to `tests/**`, DSP source files |
| **Coverage (95%)** | `test.yml` | TypeScript files must have 95% coverage |
| **Security Scan** | `semgrep.yml` | Changes to `.ts`, `.tsx`, `.js`, `.jsx`, `.cpp`, `.h` |
| **Native Build** | `main.yml` | Changes to `native/**` |
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
| Security scan | `pnpm run semgrep` | Optional locally, required in CI |

---

## Pre-Commit Hook Details

### lint-staged (All Developers)

Runs automatically via `simple-git-hooks`:

- **ESLint**: Checks and auto-fixes `.ts`, `.tsx`, `.js`, `.jsx` files
- **Prettier**: Formats all staged files

Install hooks (first time or after `pnpm install`):
```bash
pnpm run prepare
```

### Claude Code Security Review (Claude Code Only)

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

Both tools are configured to be compatible via `eslint-config-prettier`. If conflicts occur, Prettier takes precedence (it runs second in lint-staged).

### Coverage threshold failures

If coverage is below 95% for a TypeScript file:
1. Check which file failed in the error output
2. Add tests to cover the missing lines/branches
3. Coverage only applies to `.ts` files - JavaScript is exempt

### Tests timing out

Integration tests have a 60-second timeout. If tests are slow, check for:
- Missing dependencies (`pnpm install`)
- Build issues (run `pnpm run build` first for native tests)

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
