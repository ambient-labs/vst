# Code Hygiene Reference

This document provides a complete reference for all code quality and hygiene mechanisms in this repository.

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
| Security scan | `pnpm run semgrep` | Optional, runs in CI |

## Pre-Commit Hooks

Git hooks run automatically on every commit via `simple-git-hooks`.

### What Runs on Commit

1. **lint-staged** - Runs ESLint and Prettier on staged files only

### Hook Installation

Hooks are installed automatically when you run `pnpm install`. If hooks aren't working:

```bash
pnpm run prepare
```

### Skipping Hooks

For emergencies only:

```bash
SKIP_SIMPLE_GIT_HOOKS=1 git commit -m "message"
```

## Claude Code Pre-Commit Review

When Claude Code executes `git commit` commands, a pre-commit hook automatically reviews staged changes for security issues and code quality.

### What it Checks (Blocking)

- Hardcoded secrets/credentials (passwords, API keys, AWS keys)
- `eval()` usage (code injection risk)
- `innerHTML` assignment (XSS vulnerability)
- `dangerouslySetInnerHTML` usage
- Shell command injection patterns
- SQL injection patterns

### What it Warns About (Non-blocking)

- `console.log()` statements in non-test files
- TODO/FIXME comments being added
- ESLint disable comments
- `@ts-ignore` usage
- Large changes (500+ lines)

### Behavior

- **Blocks** commits with security vulnerabilities (exit code 2)
- **Warns** about code quality issues but allows commit (exit code 0)
- **Passes silently** when no issues found
- Skips review for non-code files (config, docs, shell scripts)

### Skipping Review (Not Recommended)

```bash
SKIP_CODE_REVIEW=1 git commit -m "message"
```

### Configuration

- Settings: `.claude/settings.json`
- Hook script: `.claude/hooks/pre-commit-review.sh`

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

## CI/CD Workflows

### Build Workflow (`main.yml`)

**Triggers:** Changes to native C++ code (`native/**`)

**Platforms:** macOS, Windows, Ubuntu

**What it does:**
1. Builds the full project (`pnpm run build`)
2. Verifies VST3 and AU (macOS) artifacts
3. Uploads build artifacts

### Test Workflow (`test.yml`)

**Triggers:** Changes to source files, tests, or dependencies

**Path-filtered jobs:**
- `unit-frontend` - Runs when `packages/frontend/src/**` changes
- `unit-dsp` - Runs when `packages/dsp/**/*.ts` or `packages/dsp/**/*.js` changes
- `integration` - Runs when `tests/**` or DSP source files change

**What it does:**
1. Runs unit tests with coverage reporting to Codecov
2. Runs integration tests
3. Enforces 95% coverage threshold on TypeScript files

### Semgrep (`semgrep.yml`)

**Triggers:** Changes to code files (`.ts`, `.tsx`, `.js`, `.jsx`, `.cpp`, `.h`)

**What it does:**
1. Security-focused static analysis
2. Reports findings as PR check annotations

### PR Monitor (`pr-monitor.yml`)

**Triggers:** All PRs to main

**What it does:**
1. Waits for all other workflows to complete
2. Reports aggregate pass/fail status
3. **This is the only required check for merging**

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
