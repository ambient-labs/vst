# Claude Development Workflow

This document outlines the workflow and conventions for Claude Code when working on this repository.

## Sandbox Mode

Claude Code runs in sandboxed mode by default. This affects how commands should be executed:

**Key constraints:**
- Write access is limited to the project directory and `/tmp/claude/`
- Network access is restricted to whitelisted hosts (see below)
- Some shell redirections may fail due to read-only temp directories
- SSH connections to github.com are blocked - use `gh` CLI or disable sandbox for git push

**Network allowlist:**
The sandbox only allows connections to these hosts:
- `github.com`, `api.github.com`, `raw.githubusercontent.com` - GitHub API access
- `results-receiver.actions.githubusercontent.com` - GitHub Actions

**Git push in sandbox mode:**
SSH-based git push (`git push origin branch`) will fail because SSH to github.com is blocked.
To push changes, either:
1. Disable sandbox for git operations: use `dangerouslyDisableSandbox: true`
2. Or ask the user to push manually

**Best practices for sandbox mode:**

1. **Use Claude Code's built-in tools instead of shell equivalents:**
   - Use `Read` tool instead of `cat`, `head`, `tail`
   - Use `Glob` tool instead of `find` or `ls` for file discovery
   - Use `Grep` tool instead of `grep` or `rg`
   - Use `Edit` tool instead of `sed` or `awk`
   - Use `Write` tool instead of `echo >` or heredocs

2. **Avoid shell patterns that fail in sandbox:**
   - Don't use `2>/dev/null` or other redirections in complex pipelines
   - Don't pipe through `head`/`tail` - use tool parameters instead
   - Don't use `ls` for file exploration - use `Glob` tool

3. **For temporary files:**
   - Use `/tmp/claude/` directory (TMPDIR is set automatically)
   - Don't write to `/tmp` directly

4. **When sandbox causes failures:**
   - Look for "Read-only file system" or "Operation not permitted" errors
   - These indicate sandbox restrictions, not code bugs
   - Retry with sandbox disabled only when necessary

## Workflow Overview

All development work follows this structured process.

### Slash Commands

Use these commands to streamline common workflows:

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/work <issue>` | Start work on a GitHub issue | Beginning any issue - sets up worktree, explores codebase, plans approach |
| `/research <topic>` | Deep research with experiments | Exploring unfamiliar APIs, libraries, or techniques |
| `/push` | Push branch and create PR | After implementation is complete |
| `/new-issue` | Create a GitHub issue | When you identify new work items |
| `/review <PR>` | Address PR review comments | When asked to address review feedback on a PR |

**`/work` workflow phases:**
1. **Setup** - Creates worktree and branch
2. **Discovery** - Analyzes issue requirements
3. **Codebase Exploration** - Finds relevant files and patterns
4. **Clarifying Questions** - Asks about ambiguities (skipped if clear)
5. **Planning** - Proposes approaches for complex changes (skipped for simple fixes)
6. **Ready to Implement** - Summarizes plan and awaits confirmation

**When to skip `/work`:**
- Trivial changes (typo fixes, simple config updates)
- You're already in an active worktree for the issue

### 1. Start with a GitHub Issue

- Every piece of work begins with a GitHub issue
- Use `gh issue view <number> --json title,body,state` to review issue details (avoids deprecation warnings)
- Understand the requirements fully before starting

**GitHub Issues vs Discussions:**
- **Issues**: Track specific, actionable work items (bugs, features, tasks)
- **Discussions**: Share broader plans, ideas, architecture decisions, and RFCs

**Issue Dependencies:**

When an issue depends on another issue being completed first:

1. **Note the dependency in the issue body** - Add a "Dependencies" section:
   ```markdown
   ## Dependencies
   - Depends on #XX (brief description of why)
   ```

2. **Link related issues** - Reference parent/child relationships:
   ```markdown
   ## Parent Issue
   Sub-issue of #XX
   ```

3. **Update the parent issue** - Add links to sub-issues:
   ```markdown
   ## Sub-Issues
   - #YY - Description
   - #ZZ - Description (depends on #YY)
   ```

4. **For PRs with dependencies** - Note in PR description:
   ```markdown
   **Note:** This PR should be merged after #XX is merged.
   ```

### 2. Branch Creation

**Always start from an up-to-date main branch:**

```bash
git checkout main
git pull origin main
```

**Branch naming convention:**

```
claude/<issue-number>
```

Example: For issue #14, create branch `claude/14`

```bash
git checkout -b claude/14
```

### 3. Use Git Worktrees (REQUIRED)

**IMPORTANT:** Always use git worktrees when working on issues. Multiple agents may run concurrently in this repository, and working directly in the main directory causes branch conflicts.

When working on any issue, use git worktrees to maintain separate working directories:

```bash
# Create a worktree for an issue (placed in .worktrees directory)
git worktree add .worktrees/claude-14 -b claude/14

# List all worktrees
git worktree list

# Remove a worktree when done
git worktree remove .worktrees/claude-14
```

**Important:** All worktrees should be created in the `.worktrees/` directory to keep them organized and gitignored.

Benefits:

- Work on multiple branches simultaneously without constant switching
- No need to stash/unstash changes
- Each worktree has its own working directory
- Organized in a single `.worktrees/` directory

### 4. Development Process

**Before making changes:**

- Read relevant code and documentation
- Understand the existing patterns and conventions
- Plan the minimal changes needed

**Core principle: Write as little code as possible**

- Prefer editing existing files over creating new ones
- Reuse existing patterns and utilities
- Keep implementations simple and focused

### 5. Git Pre-Commit Hooks

**Automatic quality checks run before every commit:**

The repository uses git pre-commit hooks to ensure code quality:

- **ESLint**: Automatically fixes linting errors in staged files
- **Prettier**: Formats staged files according to project style

These hooks run automatically via `lint-staged` and `simple-git-hooks`.

**What happens on commit:**

1. You run `git commit`
2. Pre-commit hook runs automatically
3. ESLint fixes linting issues in staged `.ts`, `.tsx`, `.js`, `.jsx` files
4. Prettier formats all staged files
5. Fixed files are automatically added to the commit
6. Commit proceeds if no errors

**First-time setup:**

```bash
pnpm install  # Automatically installs hooks via prepare script
```

**If hooks don't work:**

```bash
pnpm run prepare  # Manually reinstall hooks
```

### 6. Pre-Push Quality Checks

**Run these checks locally before pushing:**

```bash
# 1. Run integration tests
pnpm run test:integration

# 2. Run build (for native code changes)
pnpm run build

# 3. Fix any issues that arise
# Repeat until all checks pass
```

**Note:** Always use `pnpm` for package management, never `npm`.

**Do not push until:**

- ✅ All linter errors are resolved
- ✅ All tests pass
- ✅ Build completes successfully
- ✅ Any bugs discovered during testing are fixed

### 7. Create Pull Request

Once local checks pass:

```bash
# Push the branch
git push -u origin claude/<issue-number>

# Create PR using GitHub CLI
gh pr create --title "Brief description" --body "Detailed description" --base main
```

**PR Description should include:**

- Summary of changes
- Why the changes were made
- How to test/verify the changes
- Reference to the issue: `Fixes #<number>`
- Generated with Claude Code footer

**PR Size Guidelines:**

| Size | Lines Changed | Action |
|------|---------------|--------|
| Ideal | ~50 lines | Optimal |
| Good | <200 lines | Proceed |
| Acceptable | 200-400 lines | Consider splitting |
| Too Large | 400+ lines | Must split |

If a PR exceeds 400 lines:
1. Stop working on the current PR
2. Go back to the original issue and create sub-issues
3. Split the work into smaller, independent PRs
4. Each PR must add value on its own and not break anything

**Note:** These are guidelines. Some changes (renaming a widely-used symbol, large refactors) legitimately touch many lines but are easy to review. Use judgment.

### 8. Monitor PR Status

After creating or pushing to a PR, **monitor CI checks until all pass**:

1. **Check CI status:**

   ```bash
   gh pr checks <pr-number> --repo ambient-labs/vst
   ```

2. **Required check:**
   - `Check Commit Status` - **This is the only required check.** It's a PR Monitor that watches all other workflows and reports their combined status.

3. **Monitored workflows (run conditionally based on changed files):**
   - `native` - Native C++ build (only runs when `native/**` files change)
   - `test` - Integration tests (only runs when `dsp/**`, `tests/**`, etc. change)
   - `semgrep` - Security analysis (runs on code changes)

4. **How PR Monitor works:**
   - Runs on every PR regardless of files changed
   - Waits for other workflows to start, then polls their status
   - Passes if all monitored checks pass OR if no other workflows run (e.g., docs-only PRs)
   - Fails if any monitored workflow fails

5. **Review failures immediately:**
   - Read error messages carefully
   - Use worktree for the branch if not already
   - Fix issues locally
   - Re-run quality checks
   - Push fixes and monitor again

6. **Monitor for reviews:**
   - Address feedback from human reviewers
   - Address feedback from automated reviews
   - Keep PR updated with requested changes

**Do not leave PRs with failing CI checks.** Fix issues immediately after pushing.

### 9. Addressing PR Review Comments

When asked to address comments on a PR, **always fetch from BOTH API endpoints first**:

```bash
# Fetch review bodies (contains overall review comments)
gh api repos/ambient-labs/vst/pulls/<PR>/reviews

# Fetch line-level comments
gh api repos/ambient-labs/vst/pulls/<PR>/comments
```

**Why both endpoints?** GitHub stores PR feedback in two places:
1. **Review bodies** (`/reviews`) - Overall comments submitted with approve/request changes/comment
2. **Line comments** (`/comments`) - Comments attached to specific lines of code

**Missing either endpoint means missing feedback.** The `/reviews` endpoint is especially easy to miss but often contains the most important feedback.

**Workflow:**
1. Fetch both endpoints before any work
2. List ALL comments found for user confirmation
3. Create todo items for each comment
4. Address each comment systematically
5. Commit and push
6. **Re-fetch both endpoints** to check for new comments added while working
7. If new comments found, go back to step 3
8. Only after no new comments, monitor CI
9. If CI fails and you fix it, re-check for comments again

**CRITICAL**: Always re-check for new comments after pushing. Reviewers may add feedback while you're working on the first batch. Never declare "done" without re-fetching.

See `/review` command for the full workflow.

## Code Standards

This section documents the coding patterns and conventions used throughout this codebase. Follow these standards to maintain consistency.

### Language

- **Always use TypeScript** for new code (`.ts`, `.tsx` files)
- Existing JavaScript files (`.js`, `.jsx`) may remain, but new features should be TypeScript
- Enable strict mode in `tsconfig.json`

### Import Conventions

**File extensions in imports - ALWAYS use `.js` for local imports:**
- **TypeScript files (`.ts`, `.tsx`)**: Use `.js` extension for local imports (TypeScript resolves these)
  ```typescript
  // In packages/frontend/src/services/llm-service.ts
  import { LLMServiceError } from './llm-service-error.js';
  import type { DSPCodeResponse } from './types.js';

  // In tests/*.ts files
  import srvb from '../packages/dsp/srvb.js';
  ```
- **JSX files importing other JSX**: Include the `.jsx` extension for local imports
  ```javascript
  // In packages/frontend/src/*.jsx files
  import Interface from './Interface.jsx';
  import Knob from './Knob.jsx';
  ```
- **JS files importing local JS**: Always include the `.js` extension
  ```javascript
  // In packages/dsp/*.js files
  import { RefMap } from './RefMap.js';
  import srvb from './srvb.js';
  ```
- **Node.js built-ins**: Use the `node:` protocol prefix, prefer async versions
  ```javascript
  import { exec } from 'node:child_process';
  import { readFile } from 'node:fs/promises';
  ```
- **External packages**: Never include extensions
  ```javascript
  import { el } from '@elemaudio/core';
  import invariant from 'invariant';
  ```

### Package Manager

- **Always use `pnpm`**, never `npm` or `yarn`
  ```bash
  pnpm install           # Install dependencies
  pnpm add <package>     # Add a dependency
  pnpm add -D <package>  # Add a dev dependency
  pnpm run <script>      # Run a script
  ```

### Export Patterns

- **Prefer named exports** over default exports for better refactoring support
  ```typescript
  export function processAudio(input: AudioBuffer): AudioBuffer { ... }
  export class AudioService { ... }
  export const SAMPLE_RATE = 44100;
  ```
- **Exception**: React components may use default exports when required by framework conventions

### Test File Conventions

**Test locations:**
- **Unit tests**: Colocate next to the file they test (e.g., `services/llm-service.test.ts` for `services/llm-service.ts`)
- **Integration tests**: Place in `tests/` directory at the project root

**Test commands:**
- `pnpm run test:unit` - Run unit tests only (`src/**/*.test.ts`)
- `pnpm run test:integration` - Run integration tests only (`tests/**/*.test.ts`)

**Test config naming:**
- Unit test configs: `vitest.unit.config.ts`
- Integration test configs: `vitest.integration.config.ts`
- Always explicitly specify the config file in package.json scripts:
  ```json
  "test": "vitest run --config vitest.unit.config.ts"
  ```

**Test structure:**
- Use vitest's `describe`/`test`/`expect` pattern
- **Use `test` instead of `it`** - prefer explicit `test()` over `it()`
- Use `test.each` for parameterized tests:
  ```typescript
  test.each([
    { input: 'a', expected: 'A', description: 'lowercase' },
    { input: 'B', expected: 'B', description: 'uppercase' },
  ])('converts $description correctly', ({ input, expected }) => {
    expect(convert(input)).toBe(expected);
  });
  ```
- Extract magic numbers into named constants at file top
  ```typescript
  const SAMPLE_RATE = 44100;
  const BLOCK_SIZE = 512;
  const SMOOTHING_SETTLE_BLOCKS = 20;
  ```
- Use behavior-focused test descriptions
  ```typescript
  test('should produce complete silence at 0% volume', async () => { ... });
  ```

**Mocking with vitest:**
- Import the actual function - when mocked, it automatically refers to the mock:
  ```typescript
  import { readFile } from 'fs/promises';
  import type { readFile as readFileType } from 'fs/promises';

  vi.mock('fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs/promises')>();
    return {
      ...actual,
      readFile: vi.fn(),
    };
  });

  // In tests, the imported readFile IS the mock
  vi.mocked(readFile).mockResolvedValue('content');
  ```
- **Always type mock imports** - use `typeof import('module')` for type safety
- Put shared test config (like `clearAllMocks`) in `vitest.config.ts`:
  ```typescript
  export default defineConfig({
    test: {
      clearMocks: true,  // Instead of beforeEach(() => vi.clearAllMocks())
    },
  });
  ```
- Only use `vi.hoisted()` when absolutely necessary (e.g., mocking `promisify`)

**Coverage requirements:**
- Target >95% code coverage for new code
- Every exported function should have unit tests

### React Component Patterns

- **Functional components only**: No class components
- **Hooks**: Import individual hooks from React
  ```javascript
  import { useState, useEffect, useRef, memo } from 'react';
  ```
- **Memoization**: Use `memo()` for components that benefit from it
- **Props destructuring**: Destructure props in function signature or body
  ```javascript
  const {className, meterColor, knobColor, thumbColor, ...other} = props;
  ```

### Runtime Type Checking

- **Use `invariant` for assertions**: Prefer invariant over throwing errors manually
  ```javascript
  import invariant from 'invariant';
  invariant(typeof props === 'object', 'Unexpected props object');
  ```

### File Organization

**General principles:**
- One component/module per file
- Break large files into smaller focused modules
- Related utilities can be co-located with their main usage

**Complex React components** should use a directory structure:
```
ComponentName/
├── index.tsx      # Main component logic
├── types.ts       # TypeScript interfaces and types
└── config.ts      # Constants, theme config, default values
```

**Large text content** (system prompts, templates):
- Store in `.txt` files rather than inline strings
- Import and use as needed

**Package structure**: Follow the existing monorepo structure in `packages/`

### Naming Conventions

- **Files**: PascalCase for React components (`Knob.jsx`), camelCase for utilities (`srvb.js`)
- **Components**: PascalCase (`Interface`, `Knob`, `DragBehavior`)
- **Functions**: camelCase (`requestParamValueUpdate`, `shouldRender`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants (`SAMPLE_RATE`, `BLOCK_SIZE`)
- **Variables**: camelCase

### TypeScript Patterns

- **Vitest typing**: Tests use vitest types, not Jest
  ```typescript
  import { describe, test, expect } from 'vitest';
  ```
- **Unused variables**: Prefix with underscore to satisfy linter
  ```typescript
  const [_unused, setter] = result;
  ```
- **Async entry points**: Use try/catch with top-level await, not `.catch()`
  ```typescript
  // Preferred
  try {
    await main();
  } catch (err) {
    console.error('Fatal error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // Avoid
  main().catch((err) => { ... });
  ```

### Async/Await Patterns

- **Prefer async/await over sync functions** - use promisified versions:
  ```typescript
  // ❌ Avoid sync versions
  import { execFileSync } from 'child_process';
  const result = execFileSync(cmd, args);

  // ✅ Use async versions
  import { execFile } from 'child_process';
  import { promisify } from 'util';
  const execFileAsync = promisify(execFile);
  const result = await execFileAsync(cmd, args);
  ```

- **Use try/catch instead of .catch()** for error handling:
  ```typescript
  // ❌ Avoid .catch() chains
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });

  // ✅ Use try/catch
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
  ```

### CLI Entry Points

- **Keep CLI entry points minimal** - just import and call main:
  ```typescript
  // cli.ts - minimal entry point
  #!/usr/bin/env tsx
  import { main } from './main.js';

  try {
    await main();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
  ```
- Put all logic in `main.ts`, not in the CLI file
- Export `main` function for testability

## Code Quality Guidelines

### Minimal Code Philosophy

- Don't create new files unless absolutely necessary
- Edit existing files whenever possible
- Reuse existing utilities and patterns
- Keep functions small and focused
- Avoid over-engineering solutions

### Testing

- Integration tests are in `tests/` directory
- Run `pnpm run test:integration` before pushing
- Test files should verify behavior, not implementation details
- All tests must pass before pushing

**Tests Must Be Inline with Code Changes:**
- When adding a feature, include tests in the same PR
- When fixing a bug, include a regression test in the same PR
- Do NOT create separate "add tests" PRs - tests belong with the code they test
- If a change requires new tests, they are part of the same unit of work

### Building

- Native plugin code requires CMake build
- JavaScript/TypeScript code requires Vite build
- Always verify builds succeed locally
- Build artifacts should match expected structure

### Linting

- Follow the ESLint configuration
- Fix linting errors, don't disable rules
- Maintain consistent code style
- Run `pnpm run lint` before pushing

### Semgrep (Static Analysis)

Semgrep runs automated security analysis on PRs via GitHub Actions and in the pre-commit hook.

**Run locally (requires Docker):**

```bash
pnpm run semgrep
```

This uses the Semgrep Docker image to scan the codebase with the `auto` config, which includes 1000+ security rules covering OWASP vulnerabilities.

**CI Integration:**

Semgrep runs automatically on PRs that modify code files (`.ts`, `.tsx`, `.js`, `.jsx`, `.cpp`, `.h`).

**Suppressing false positives:**

Use inline `// nosemgrep` comments on the line **before** the flagged code:
```typescript
// nosemgrep
const filePath = path.join(userDir, filename);
```

**Important:** Do NOT add entire folders to `.semgrepignore`. Use inline suppressions so the rest of the file is still scanned. Only add to `.semgrepignore` for:
- Third-party code (submodules, vendored deps)
- Generated files
- Build outputs

### Documentation

**Documentation Must Be Inline with Code Changes:**
- When adding a feature, include relevant documentation in the same PR
- Update existing docs if your change affects documented behavior
- Do NOT create separate "add docs" PRs - docs belong with the code they describe
- Code comments, JSDoc, and README updates are all part of the same unit of work

**What to Document:**
- Public APIs and exported functions
- Complex algorithms or non-obvious logic
- Configuration options and their effects
- Breaking changes or migration steps

## AI Code Generation Guidelines

### Claude Code Pre-Commit Review Hook

A pre-commit hook automatically reviews staged changes before committing. This runs when Claude Code executes `git commit` commands and catches issues before they enter the codebase.

**What it checks (blocking issues):**
- Hardcoded secrets/credentials (passwords, API keys, AWS keys)
- `eval()` usage (code injection risk)
- `innerHTML` assignment (XSS vulnerability)
- `dangerouslySetInnerHTML` usage
- Shell command injection patterns
- SQL injection patterns

**What it warns about (non-blocking):**
- `console.log()` statements in non-test files
- TODO/FIXME comments being added
- ESLint disable comments
- `@ts-ignore` usage
- Large changes (500+ lines)

**Behavior:**
- **Blocks** commits with security vulnerabilities (exit code 2)
- **Warns** about code quality issues but allows commit (exit code 0)
- **Passes silently** when no issues found
- Skips review for non-code files (config, docs, shell scripts)

**To skip pattern-based review (not recommended):**
```bash
SKIP_CODE_REVIEW=1 git commit -m "message"
```

**Configuration:**
The hook is configured in `.claude/settings.json` and implemented in `.claude/hooks/pre-commit-review.sh`.

### Semantic Code Review (Integrated)

After pattern-based checks pass, the pre-commit hook triggers semantic analysis. This prompts Claude to review the staged diff for issues that pattern matching cannot catch:

**What semantic review checks:**
- **CLAUDE.md compliance** - import conventions, export patterns, TypeScript usage
- **Logic bugs** - null access, off-by-one errors, resource leaks, async issues
- **Code comment compliance** - respects TODO warnings and inline guidance
- **Pattern consistency** - matches surrounding code patterns

**Behavior:**
- Runs automatically after pattern checks pass
- Claude reviews the staged diff and either proceeds silently or flags issues
- Only high-confidence issues are flagged (senior engineer standard)
- If issues found, Claude asks whether to proceed or fix first

**False positive handling:**
The semantic review ignores:
- Pre-existing issues (not in the staged diff)
- Style nitpicks and linter-catchable problems
- Intentional functionality changes

### Code Review for AI-Generated Code

All AI-generated code goes through the same review process as human-written code:

1. **Local Pre-Commit Hook**: Pattern-based security checks + semantic analysis
2. **Automated Checks**: CI runs linting, tests, builds, and security analysis (Semgrep)
3. **Human Review**: Final approval from a human maintainer is required

**Review Focus Areas:**
- Security vulnerabilities (injection, XSS, unsafe operations)
- Performance implications (especially in audio processing paths)
- Adherence to existing patterns and conventions
- Test coverage for new functionality
- Clear, maintainable code over clever solutions

### Security Considerations

**Code Execution Safety:**
- The DSP code runs in a sandboxed JavaScript environment within the native plugin
- Never execute arbitrary user input as code
- Validate all external inputs before processing
- Be cautious with `JSON.parse()` - wrap in try/catch

**Build and Dependency Security:**
- Only use dependencies from trusted sources (npm registry)
- Review dependency updates for security advisories
- Native code changes require extra scrutiny for memory safety

**File System Operations:**
- Scripts should only access expected directories
- Never write to system directories
- Validate paths before file operations

## Project Structure

```
.
├── packages/
│   ├── frontend/     # React UI components
│   └── dsp/          # Elementary audio processing code
├── native/           # C++ JUCE plugin code
│   ├── *.cpp/*.h    # Plugin source files
│   └── CMakeLists.txt
├── tests/            # Integration tests
├── scripts/          # Build and utility scripts
│   └── <name>/       # Script packages (see below)
└── .github/          # CI/CD workflows
```

### Script Package Structure

Each script in `scripts/` that has significant logic should be its own package:

```
scripts/<name>/
├── package.json          # Own dependencies and test scripts
├── vitest.unit.config.ts # Test configuration
├── config.json           # Runtime configuration (if needed)
└── src/
    ├── cli.ts            # Minimal entry point
    ├── main.ts           # Main logic (exported for testing)
    ├── *.ts              # Other modules
    └── *.test.ts         # Colocated unit tests
```

**package.json requirements:**
```json
{
  "name": "<name>",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run --config vitest.unit.config.ts"
  }
}
```

**Root package.json integration:**
```json
{
  "scripts": {
    "test:scripts": "pnpm -r --filter './scripts/*' test"
  }
}
```

## Common Commands

```bash
# Development
pnpm run dev          # Start dev server
pnpm run build        # Build everything

# Testing
pnpm run test:integration  # Run integration tests

# Code Quality
pnpm run lint         # Run linter
pnpm run format       # Format code

# Git Operations
gh issue list         # List open issues
gh issue view <n>     # View issue details
gh pr checks          # View PR CI status
gh pr view            # View current PR
```

## Important Notes

### Git Worktrees (REQUIRED)

- **REQUIRED** - not optional. Multiple agents run concurrently
- Working in main directory causes branch conflicts between agents
- Each worktree is independent and isolated
- Always work in `.worktrees/claude-<issue>` directory
- Clean up worktrees when done

### Dependencies

- **Always use `pnpm` for package management (never use `npm`)**
- Lock files should be committed
- Native code depends on JUCE submodules
- When adding packages: `pnpm add <package>` or `pnpm add -D <package>` for dev dependencies

### CI/CD

- **PR Monitor (`Check Commit Status`)** is the only required check for merging
- PR Monitor aggregates results from all other workflows
- Path filters skip expensive builds/tests for docs-only changes
- Native builds run on macOS, Windows, and Ubuntu
- Semgrep runs security analysis on code changes

### Communication

- Always reference issue numbers in commits
- Use conventional commit messages
- Include "Fixes #X" in PR descriptions
- Add Claude Code generation footer

## Anti-Patterns to Avoid

❌ **Don't:**

- Push without running tests
- Create new files unnecessarily
- Skip the linting step
- Work directly on main
- Forget to reference issues
- Push broken code and "fix it in CI"

✅ **Do:**

- Start from a clean main branch
- Run all quality checks locally
- Write minimal, focused code
- Use worktrees for parallel work
- Reference issues consistently
- Fix problems before pushing

---

_This workflow ensures high code quality, consistent patterns, and efficient collaboration between Claude Code and human developers._
