# Address PR Review Comments

Fetch and address all review comments on a pull request.

## Arguments

- `$ARGUMENTS` - The PR number (e.g., `42` or `#42`)

## Workflow

### Phase 1: Fetch All Comments

**CRITICAL**: Always fetch comments from the API first. Never rely on conversation summaries.

```bash
gh api repos/ambient-labs/vst/pulls/<PR>/comments
```

Parse the JSON response to extract:
- `path` - File being commented on
- `line` / `original_line` - Line number
- `body` - The actual comment text
- `user.login` - Who made the comment

### Phase 2: List and Confirm

Present ALL comments found to the user:

```
## PR #<number> Review Comments

Found <N> comments:

1. **<path>:<line>** (@<user>)
   > <comment body summary>

2. **<path>:<line>** (@<user>)
   > <comment body summary>

...

Please confirm these are all the comments to address, or let me know if I missed any.
```

### Phase 3: Create Todo Items

Create a todo item for each comment:

```
TodoWrite([
  { content: "Address: <short description>", status: "pending", activeForm: "Addressing <short description>" },
  ...
])
```

### Phase 4: Address Each Comment

For each comment:

1. Mark the todo as `in_progress`
2. Read the relevant file
3. Understand the requested change
4. Make the change
5. Mark the todo as `completed`
6. Move to the next comment

### Phase 5: Summary

After addressing all comments:

1. Show a summary of changes made
2. Run relevant tests/lints
3. Commit with a message referencing the PR
4. Push and monitor CI

## Error Handling

- **No comments found**: Inform user the PR has no review comments
- **PR not found**: Display error from `gh` CLI
- **Ambiguous comment**: Ask user for clarification before proceeding

## Why This Workflow Matters

Conversation summaries from previous sessions may be incomplete. The GitHub API is the authoritative source for what comments exist and need to be addressed. Always verify before starting work.
