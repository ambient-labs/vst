# Start Work on GitHub Issue

Start working on a GitHub issue with structured discovery, exploration, and planning phases.

## Arguments

- `$ARGUMENTS` - The GitHub issue number (e.g., `42` or `#42`)

## Workflow Phases

### Phase 1: Setup

1. **Parse the issue number** from `$ARGUMENTS`:
   - Strip any leading `#` character
   - Validate it's a valid number
   - If missing or invalid, ask the user to provide an issue number

2. **Fetch the issue details**:

   ```bash
   gh issue view <number> --repo ambient-labs/vst --json title,body,state,labels,comments
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

### Phase 2: Discovery

Analyze the issue to understand requirements:

1. **Summarize the task** in 2-3 sentences
2. **Identify the type**: bug fix, new feature, refactor, docs, etc.
3. **List explicit requirements** from the issue description
4. **List implicit requirements** (inferred from context)
5. **Note any constraints** mentioned (performance, compatibility, etc.)

### Phase 3: Codebase Exploration

Find relevant code and understand existing patterns:

1. **Search for related files** using Glob and Grep:
   - Files that will likely need changes
   - Files with similar functionality to reference
   - Test files that cover related behavior

2. **Identify patterns** in the existing code:
   - How similar features are implemented
   - Naming conventions used
   - Error handling patterns
   - Test patterns

3. **Map dependencies**:
   - What this code depends on
   - What depends on this code

### Phase 4: Clarifying Questions

Before proceeding, ask the user about any ambiguities:

- Only ask if there are **genuine ambiguities** that affect implementation
- Don't ask about things clearly specified in the issue
- Don't ask about things that can be inferred from codebase patterns
- Limit to 1-3 questions maximum

**Skip this phase** if the task is straightforward and requirements are clear.

### Phase 5: Planning (Complex Changes Only)

For complex changes (multi-file, architectural decisions), propose approaches:

1. **Option A**: [Brief description]
   - Pros: ...
   - Cons: ...

2. **Option B**: [Brief description]
   - Pros: ...
   - Cons: ...

**Recommend** one option with rationale.

**Skip this phase** for:
- Simple bug fixes
- Single-file changes
- Changes that follow obvious existing patterns

### Phase 6: Ready to Implement

Display summary and await user confirmation:

```
## Issue #<number>: <title>

**Type:** <bug fix | feature | refactor | docs>
**Complexity:** <simple | moderate | complex>

### Task Summary
<2-3 sentence summary>

### Files to Modify
- `path/to/file.ts` - <what changes>
- `path/to/other.ts` - <what changes>

### Implementation Approach
<Brief description of chosen approach>

---

✓ Worktree: .worktrees/claude-<number>
✓ Branch: claude/<number>

Ready to implement. Proceed?
```

## Error Handling

- **Missing issue number**: Ask the user to provide one
- **Issue not found**: Display error from `gh` CLI
- **Network error**: Inform user and suggest checking connectivity
- **Worktree already exists**: Offer to reuse or recreate
- **Branch already exists on remote**: Fetch and use existing branch

## Guidelines

- **Don't over-engineer discovery** for simple tasks
- **Skip phases** that don't add value (noted above)
- **Be concise** - summaries should be scannable
- **Show your work** - list files found, patterns identified
- **Ask early** - clarifying questions before coding, not during
