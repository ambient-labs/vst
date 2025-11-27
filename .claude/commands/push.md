---
description: Push branch and monitor CI with automatic fix cycles
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite
argument-hint: "[-m \"commit message\"] - optional commit message for fixes"
---

# Push and Monitor CI

Push the current branch to origin and monitor CI checks until all pass.

## Arguments

- `$ARGUMENTS` - Optional flags:
  - `-m "message"` - Custom commit message prefix for any fix commits

## Workflow

### 1. Pre-Push Validation

Before pushing, verify:
- Working tree is clean OR there are staged changes ready to commit
- Current branch is not `main` (never push directly to main)
- Branch name follows `claude/<number>` pattern

```bash
git status
git branch --show-current
```

If there are uncommitted changes, warn the user and ask if they want to:
- Commit them with the push
- Stash them and continue
- Abort

### 2. Push to Origin

Push the current branch to origin:

```bash
git push -u origin $(git branch --show-current)
```

**Important:** Use `dangerouslyDisableSandbox: true` for git push since SSH is blocked in sandbox mode.

If push fails due to:
- **Diverged branches**: Ask user if they want to pull and rebase first
- **No upstream**: Use `-u` flag to set upstream (already included above)
- **Permission denied**: Inform user to check their SSH keys or use HTTPS

### 3. Create or Find PR

Check if a PR exists for this branch:

```bash
gh pr view --json number,url,state 2>/dev/null || echo "NO_PR"
```

If no PR exists:
- Inform user that no PR exists yet
- Ask if they want to create one with `gh pr create`
- If yes, help them create it, then continue monitoring

### 4. Monitor CI Checks

Poll CI status every 30 seconds until all checks complete:

```bash
gh pr checks --json name,state,conclusion
```

**Status interpretation:**
- `state: "pending"` - Still running
- `state: "completed"` with `conclusion: "success"` - Passed
- `state: "completed"` with `conclusion: "failure"` - Failed
- `state: "completed"` with `conclusion: "skipped"` - Skipped (OK)

Keep polling while any check has `state: "pending"`.

### 5. Handle Failures

When a check fails:

1. **Identify the failed workflow**:
   ```bash
   gh pr checks --json name,state,conclusion,link
   ```

2. **Get the run ID** from the failed check's link or:
   ```bash
   gh run list --branch $(git branch --show-current) --json databaseId,name,conclusion --limit 5
   ```

3. **Fetch failure logs**:
   ```bash
   gh run view <run-id> --log-failed
   ```

4. **Analyze the failure**:
   - Parse the error messages
   - Identify the root cause
   - Determine what files need changes

5. **Fix the issue**:
   - Make the necessary code changes
   - Run relevant local checks (lint, test, build)
   - Verify the fix works locally

6. **Commit and push the fix**:
   ```bash
   git add -A
   git commit -S -m "fix: <description of fix>

   Addresses CI failure in <workflow-name>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   git push
   ```

7. **Return to step 4** (continue monitoring)

### 6. Success

When all checks pass:

```bash
gh pr checks --json name,state,conclusion
```

Display a summary:
- ✓ All CI checks passed
- PR URL for review
- Suggest next steps (request review, merge if approved)

## Error Handling

- **Network errors**: Retry with exponential backoff (max 3 retries)
- **Rate limiting**: Wait and retry as suggested by GitHub API
- **Unfixable failures**: Report the issue clearly and ask user for guidance
- **Flaky tests**: If same test fails/passes inconsistently, note this pattern

## Important Notes

- Always use signed commits (`-S` flag) for this repository
- Never force push unless explicitly asked
- If fixes require user input or decisions, ask before proceeding
- Keep the user informed of progress with clear status updates
- Use the TodoWrite tool to track fix attempts if multiple issues need addressing

## Example Session

```
Pushing claude/42 to origin...
✓ Pushed successfully

Monitoring CI checks for PR #42...

[30s] ⏳ test: pending, native: pending
[60s] ⏳ test: pending, native: success
[90s] ❌ test: failed, native: success

Fetching failure logs for 'test' workflow...

Error found: TypeError in dsp/effects.ts:42
  Cannot read property 'gain' of undefined

Fixing: Add null check for gain parameter...
✓ Fix applied and committed
✓ Pushed fix

Resuming CI monitoring...

[30s] ⏳ test: pending
[60s] ✓ test: success

✅ All CI checks passed!

PR #42 is ready for review: https://github.com/ambient-labs/vst/pull/42
```
