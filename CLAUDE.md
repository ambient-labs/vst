# Claude Development Workflow

This document outlines the workflow and conventions for Claude Code when working on this repository.

## Workflow Overview

All development work follows this structured process:

### 1. Start with a GitHub Issue

- Every piece of work begins with a GitHub issue
- Use `gh issue view <number>` to review issue details
- Understand the requirements fully before starting

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

### 3. Use Git Worktrees (Preferred)

When working on multiple issues simultaneously, use git worktrees to maintain separate working directories:

```bash
# Create a worktree for an issue
git worktree add ../srvb-claude-14 -b claude/14

# List all worktrees
git worktree list

# Remove a worktree when done
git worktree remove ../srvb-claude-14
```

Benefits:
- Work on multiple branches simultaneously without constant switching
- No need to stash/unstash changes
- Each worktree has its own working directory

### 4. Development Process

**Before making changes:**
- Read relevant code and documentation
- Understand the existing patterns and conventions
- Plan the minimal changes needed

**Core principle: Write as little code as possible**
- Prefer editing existing files over creating new ones
- Reuse existing patterns and utilities
- Keep implementations simple and focused

### 5. Pre-Push Quality Checks

**Run these checks locally before pushing:**

```bash
# 1. Run integration tests
pnpm run test:integration

# 2. Run build (for native code changes)
pnpm run build

# 3. Fix any issues that arise
# Repeat until all checks pass
```

**Do not push until:**
- ✅ All linter errors are resolved
- ✅ All tests pass
- ✅ Build completes successfully
- ✅ Any bugs discovered during testing are fixed

### 6. Create Pull Request

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

### 7. Monitor PR Status

After creating the PR:

1. **Check CI status:**
   ```bash
   gh pr checks
   ```

2. **Review failures:**
   - Read error messages carefully
   - Pull down the branch if not already in a worktree
   - Fix issues locally
   - Re-run quality checks
   - Push fixes

3. **Iterate until green:**
   - Fix any failing tests
   - Fix any linting issues
   - Fix any build failures
   - Ensure all CI checks pass

4. **Monitor for reviews:**
   - Address feedback from human reviewers
   - Address feedback from automated reviews
   - Keep PR updated with requested changes

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

## Project Structure

```
.
├── src/              # React UI components
├── dsp/              # Elementary audio processing code
├── native/           # C++ JUCE plugin code
│   ├── *.cpp/*.h    # Plugin source files
│   └── CMakeLists.txt
├── tests/            # Integration tests
├── scripts/          # Build scripts
└── .github/          # CI/CD workflows
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

### Git Worktrees
- Preferred over branch switching
- Allows parallel work on multiple issues
- Each worktree is independent
- Clean up worktrees when done

### Dependencies
- Use `pnpm` for package management
- Lock files should be committed
- Native code depends on JUCE submodules

### CI/CD
- Tests run on macOS (required for native builds)
- Build verification checks artifact existence
- Path filters skip builds for docs/config changes
- Claude Code Review runs on PR open and manual trigger

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

*This workflow ensures high code quality, consistent patterns, and efficient collaboration between Claude Code and human developers.*
