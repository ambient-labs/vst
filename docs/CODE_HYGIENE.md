# Code Hygiene Reference

This document provides a complete reference for all code quality and hygiene mechanisms in this repository.

## Quick Reference

| What | Command | When |
|------|---------|------|
| Lint code | `pnpm run lint` | Before committing |
| Fix lint issues | `pnpm run lint:fix` | When lint fails |
| Check formatting | `pnpm run format:check` | Before committing |
| Format code | `pnpm run format` | When format check fails |
| Run tests | `pnpm run test:integration` | Before pushing |
| Full build | `pnpm run build` | Before pushing native changes |

## Pre-Commit Hooks

Git hooks run automatically on every commit via `simple-git-hooks`.

### What Runs on Commit

1. **lint-staged** - Runs ESLint and Prettier on staged files only
2. **DeepSource** - Reports static analysis to DeepSource dashboard

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

## Static Analysis (DeepSource)

DeepSource provides deeper static analysis beyond ESLint.

### Analyzers Enabled

1. **JavaScript/TypeScript** - React plugin, browser/nodejs environments
2. **C++** - For native code

### Setup

1. Install the CLI (one-time):
   ```bash
   pnpm run deepsource:install
   ```

2. Ensure `.env` contains:
   ```
   DEEPSOURCE_DSN=<your-dsn>
   DEEPSOURCE_PAT=<your-token>
   ```

### Manual Run

```bash
pnpm run deepsource
```

### CI Integration

DeepSource runs automatically on PRs via the GitHub App. Results appear as check annotations.

## Testing

### Integration Tests (Vitest)

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

**Triggers:** Changes to native C++ code

**Platforms:** macOS, Windows, Ubuntu

**What it does:**
1. Builds the full project (`pnpm run build`)
2. Verifies VST3 and AU (macOS) artifacts
3. Uploads build artifacts

### Test Workflow (`test.yml`)

**Triggers:** Changes to DSP, tests, or dependencies

**What it does:**
1. Runs integration tests on Ubuntu

### Claude Code Review (`claude-code-review.yml`)

**Triggers:** PRs with code, config, or doc changes

**What it does:**
1. AI-powered code review
2. Posts review comments on PR

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

### DeepSource failing in pre-commit

Ensure `.env` file exists with valid credentials. The pre-commit hook runs DeepSource but continues even if it fails.

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
| `test:integration` | Run integration tests |
| `deepsource` | Run DeepSource analysis |
| `deepsource:install` | Install DeepSource CLI |
| `prepare` | Install git hooks |
| `clean` | Remove build artifacts |
