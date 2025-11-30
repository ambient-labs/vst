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

†**Slow checks:** Semgrep and native build take >30 seconds and are **skipped by default** locally. They always run in CI. To run them locally: `RUN_SLOW_CHECKS=1 git commit`

### How It Works

1. You run `git commit`
2. `simple-git-hooks` triggers `scripts/pre-commit.sh`
3. **Sequential**: ESLint and Prettier run first (auto-fix and re-stage)
4. **Parallel**: Tests run concurrently (slow checks skipped by default)
5. **If Claude Code**: Code review hook also runs (security + quality checks)
6. Commit proceeds only if all checks pass

### Path Filtering

The pre-commit script uses the same path filtering as CI - checks only run when relevant files are staged:

- Frontend tests: `packages/frontend/src/**`, `packages/frontend/vitest.unit.config.ts`, `packages/frontend/package.json`
- DSP tests: `packages/dsp/**/*.{js,ts}`, `packages/dsp/vitest.unit.config.ts`, `packages/dsp/package.json`
- Integration tests: `tests/**`, `vitest.integration.config.ts`
- Native build†: `native/**`
- All checks: Also trigger on root `package.json` or `pnpm-lock.yaml` changes

### Running Slow Checks Locally

```bash
RUN_SLOW_CHECKS=1 git commit -m "message"     # Include slow checks (Semgrep, native build)
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

## PR Size Guidelines

Keep PRs small for faster, more thorough reviews.

| Size | Lines Changed | Action |
|------|---------------|--------|
| **Ideal** | ~50 lines | Optimal for review |
| **Good** | <200 lines | Reviews complete in <1 hour |
| **Acceptable** | 200-400 lines | Consider splitting |
| **Too Large** | 400+ lines | Must split |

### When a PR Gets Too Large

1. **Stop** - Don't keep adding to an oversized PR
2. **Create sub-issues** - Break the original issue into smaller pieces
3. **Split the PR** - Create separate PRs for each sub-issue
4. **Each PR must be self-contained** - Adds value, doesn't break anything

### Why Size Matters

- PRs under 200 lines merge ~40% faster
- 50-line changes are 15% less likely to be reverted
- Reviews of 200-400 lines yield 70-90% defect discovery
- Beyond 400 lines, review quality drops significantly

**Exceptions:** Some changes (renaming widely-used symbols, mechanical refactors) touch many lines but are easy to review. Use judgment.

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

---

## Codebase Patterns & Idioms

This section documents the specific patterns and conventions for this codebase. React patterns follow modern best practices (2024-2025); TypeScript/DSP patterns follow our established conventions.

### React Component Patterns

**Function declarations for components:**
Use function declarations (not arrow functions) for React components. This provides better stack traces and matches modern React conventions.

```typescript
// ✅ Correct
export function AudioKnob({ value, onChange, className }: AudioKnobProps) {
  // ...
}

// ❌ Avoid
const AudioKnob = ({ value, onChange }: AudioKnobProps) => { ... }
```

**Props destructuring in signature:**
Destructure props directly in the function signature for clarity and IDE support.

```typescript
// ✅ Correct - destructure in signature
export function Knob({
  value,
  onChange,
  className,
  ...rest
}: KnobProps) {
  return <div className={className} {...rest} />;
}

// ❌ Avoid - destructure in body
function Knob(props) {
  const { value, onChange, className, ...rest } = props;
}
```

**Named functions in useEffect:**
Use named function expressions in hooks for better debugging - stack traces show the function name instead of "(anonymous)".

```typescript
// ✅ Correct - named functions
useEffect(function syncAudioParameter() {
  // Effect logic here
  return function cleanupAudioParameter() {
    // Cleanup logic
  };
}, [value]);

// ❌ Avoid - anonymous arrows
useEffect(() => {
  return () => {};
}, [value]);
```

**Use clsx for class names:**
Use `clsx` (not `classnames`) for conditional class concatenation - it's smaller (239B vs 700B) and faster.

```typescript
// ✅ Correct
import { clsx } from 'clsx';

const classes = clsx(
  'knob-base',
  isDragging && 'knob-dragging',
  className
);

// ❌ Avoid - inline utility or classnames
function cx(...classes) { return classes.filter(Boolean).join(' ') }
import cx from 'classnames';
```

**Props spreading with rest parameters:**
Pass through unhandled props using rest spreading for component flexibility.

```typescript
// ✅ Correct
export function Button({ variant, className, ...rest }: ButtonProps) {
  return <button className={clsx(variants[variant], className)} {...rest} />;
}
```

### Native Interop Patterns

**globalThis for bidirectional communication:**
Register callbacks on `globalThis` for native code to call.

```javascript
// ✅ Correct (packages/frontend/src/main.jsx:80-86)
globalThis.__receiveStateChange__ = function(state) {
  store.setState(JSON.parse(state));
};
```

**Defensive typeof checks:**
Always check if native functions exist before calling them.

```javascript
// ✅ Correct (packages/frontend/src/main.jsx:56-61)
if (typeof globalThis.__postNativeMessage__ === 'function') {
  globalThis.__postNativeMessage__("setParameterValue", { paramId, value });
}
```

### DSP/TypeScript Patterns

These patterns are specific to this codebase and must be followed exactly.

**shouldRender optimization:**
Use a decision function to determine when full re-renders are needed vs. ref updates.

```javascript
// ✅ Correct (packages/dsp/main.js:22-24)
function shouldRender(prev, nextState) {
  return (prev === null) || (prev.sampleRate !== nextState.sampleRate);
}

// In callback:
if (shouldRender(prevState, state)) {
  core.render(...);  // Full render
} else {
  refs.update('decay', { value: state.decay });  // Just update refs
}
```

**RefMap for lazy ref creation:**
Use the RefMap pattern to lazily create and cache Elementary refs.

```javascript
// ✅ Correct (packages/dsp/RefMap.js)
export class RefMap {
  getOrCreate(name, type, props, children) {
    if (!this._map.has(name)) {
      const ref = this._core.createRef(type, props, children);
      this._map.set(name, ref);
    }
    return this._map.get(name)[0];  // Return getter
  }

  update(name, props) {
    const [, setter] = this._map.get(name);  // Get setter
    setter(props);
  }
}
```

**invariant for defensive assertions:**
Use the `invariant` library for runtime type checks and assertions.

```javascript
// ✅ Correct (packages/dsp/srvb.js:5)
import invariant from 'invariant';
invariant(typeof props === 'object', 'Unexpected props object');
```

### Testing Patterns

**Named constants for magic numbers:**
Extract test configuration values as constants at the top of describe blocks.

```javascript
// ✅ Correct (tests/volume-knob.test.ts:6-10)
const SAMPLE_RATE = 44100;
const BLOCK_SIZE = 512;
const SMOOTHING_SETTLE_BLOCKS = 20;
const AMPLITUDE_TOLERANCE = 1;
const SILENCE_THRESHOLD = 0.000001;
```

**Smoothing verification with block loops:**
Test audio smoothing by processing multiple blocks in a loop.

```javascript
// ✅ Correct (tests/volume-knob.test.ts:76-81)
for (let i = 0; i < SMOOTHING_SETTLE_BLOCKS; i++) {
  core.process([inputLeft, inputRight], [outputLeft, outputRight]);
}
```

**Amplitude calculation with reduce:**
Use `reduce` to calculate average amplitude across a block.

```javascript
// ✅ Correct (tests/volume-knob.test.ts:84-85)
const avgLeft = outputLeft.reduce((sum, val) => sum + Math.abs(val), 0) / BLOCK_SIZE;
```

**toBeCloseTo for floating-point:**
Use `toBeCloseTo` with tolerance for amplitude comparisons.

```javascript
// ✅ Correct (tests/volume-knob.test.ts:90)
expect(avgLeft).toBeCloseTo(expectedAmplitude, AMPLITUDE_TOLERANCE);
```

### Configuration Patterns

**Test environment by package:**
- Frontend tests: `environment: 'jsdom'`
- DSP tests: `environment: 'node'`
- Integration tests: `environment: 'node'`, `testTimeout: 60000`

**Per-file coverage thresholds:**
Coverage is enforced per-file, not just overall.

```typescript
// ✅ Correct (vitest.unit.config.ts)
thresholds: {
  perFile: true,  // Each file must meet threshold
  statements: 95,
  branches: 95,
  functions: 95,
  lines: 95,
}
```

### Import Conventions (Additional Details)

**Import order:**
1. React and React hooks
2. External libraries
3. Local components/modules
4. CSS imports

```javascript
// ✅ Correct order (packages/frontend/src/main.jsx)
import React from 'react'
import ReactDOM from 'react-dom/client'
import Interface from './Interface.jsx'

import createHooks from 'zustand'
import createStore from 'zustand/vanilla'

import './index.css'
```

**JSX imports with extension:**
Include `.jsx` extension for JSX component imports (matches ESM convention).

```javascript
// ✅ Correct
import Interface from './Interface.jsx';
import Knob from './Knob.jsx';
```

