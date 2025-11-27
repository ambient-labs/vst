# Start Work on GitHub Issue

Start working on a GitHub issue by setting up the development environment.

## Arguments

- `$ARGUMENTS` - The GitHub issue number (e.g., `42` or `#42`)

## Instructions

1. **Parse the issue number** from `$ARGUMENTS`:
   - Strip any leading `#` character
   - Validate it's a valid number
   - If missing or invalid, ask the user to provide an issue number

2. **Fetch the issue details**:

   ```bash
   gh issue view <number> --repo ambient-labs/vst --json title,body,state,labels
   ```

   - If the issue doesn't exist or is closed, inform the user and stop

3. **Fetch latest from origin**:

   ```bash
   git fetch origin main
   ```

4. **Check for existing worktree**:
   - Check if `.worktrees/claude-<number>` already exists
   - If it exists, ask the user if they want to use the existing worktree or remove and recreate it

5. **Create the git worktree**:

   ```bash
   git worktree add .worktrees/claude-<number> -b claude/<number> origin/main
   ```

   - If the branch `claude/<number>` already exists, use:
     ```bash
     git worktree add .worktrees/claude-<number> claude/<number>
     ```

6. **Display summary**:
   - Show the issue title and description
   - Confirm the worktree was created at `.worktrees/claude-<number>`
   - Confirm the branch is `claude/<number>`
   - Remind the user that all work should be done in the worktree directory

## Error Handling

- **Missing issue number**: Ask the user to provide one
- **Issue not found**: Display error from `gh` CLI
- **Network error**: Inform user and suggest checking connectivity
- **Worktree already exists**: Offer to reuse or recreate
- **Branch already exists on remote**: Fetch and use existing branch

## Example Output

```
## Issue #42: Add dark mode support

**State:** OPEN
**Labels:** enhancement, ui

### Description
Add a dark mode toggle to the settings panel...

---

✓ Fetched latest from origin/main
✓ Created worktree at .worktrees/claude-42
✓ Branch: claude/42

Ready to work! All changes should be made in the worktree directory.
```
