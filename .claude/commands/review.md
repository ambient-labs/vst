# Address PR Review Comments

Fetch and address all review comments on a pull request.

## Arguments

- `$ARGUMENTS` - The PR number (e.g., `42` or `#42`)

## Workflow

### Phase 1: Fetch All Comments

**CRITICAL**: Always fetch comments from BOTH API endpoints. Never rely on conversation summaries.

```bash
# Fetch review bodies (contains overall review comments)
gh api repos/ambient-labs/vst/pulls/<PR>/reviews

# Fetch line-level comments
gh api repos/ambient-labs/vst/pulls/<PR>/comments
```

**Review bodies** (`/reviews` endpoint):
- Contains the main review comment body submitted with the review
- Parse `body` field for the reviewer's overall feedback
- These are often the most important comments and easy to miss!

**Line comments** (`/comments` endpoint):
- Contains comments attached to specific lines of code
- Parse `path`, `line`, and `body` fields

### Phase 2: List and Confirm

Present ALL comments found to the user:

```
## PR #<number> Review Comments

### Review Bodies
Found <N> reviews:

1. **Review by @<user>** (<state>)
   > <review body summary>

### Line Comments
Found <M> line comments:

1. **<path>:<line>** (@<user>)
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

GitHub has TWO separate places for PR feedback:
1. **Review bodies** - Overall comments submitted with a review (approve/request changes/comment)
2. **Line comments** - Comments attached to specific lines of code

Both endpoints MUST be checked. Missing the `/reviews` endpoint means missing potentially critical feedback in the review body.
