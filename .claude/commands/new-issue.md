---
description: Create a well-formed GitHub issue
allowed-tools: Bash, AskUserQuestion
argument-hint: "[\"Title\" \"Description\"] - optional, interactive if omitted"
---

# Create GitHub Issue

Create a concise, actionable GitHub issue following project conventions.

## Arguments

`$ARGUMENTS` - Optional: `"Title" "Description"` in quotes

## Instructions

### 1. Parse Arguments or Gather Interactively

**If arguments provided:**
- Parse title and description from `$ARGUMENTS`
- Format: `"Title here" "Description here"`

**If no arguments:**
- Ask the user what they want to create an issue for
- Gather enough context to write a concise issue

### 2. Draft the Issue

Create an issue following this structure:

**Title:** Brief, imperative mood (e.g., "Add dark mode toggle", "Fix memory leak in audio buffer")

**Body:**
```markdown
## Summary

1-2 sentences describing what needs to be done and why.

## Details

- Specific requirement or constraint
- Another detail (if needed)
- Keep bullets concise and actionable

## Acceptance Criteria

- [ ] How to verify this is complete
- [ ] Another verification step (if needed)
```

**Guidelines:**
- Summary: Focus on *what* and *why*, not *how*
- Details: Only include if there are specific constraints or requirements
- Acceptance criteria: Only include if completion isn't obvious from the summary
- Omit sections that aren't needed - simpler is better

### 3. Confirm with User

Show the drafted issue and ask for confirmation before creating:

```
## Preview

**Title:** [title]

**Body:**
[body content]

---
Create this issue? (yes/no/edit)
```

### 4. Create the Issue

Once confirmed, create the issue:

```bash
gh issue create --repo ambient-labs/vst --title "Title" --body "Body"
```

Use a heredoc for the body to preserve formatting:

```bash
gh issue create --repo ambient-labs/vst --title "Title" --body "$(cat <<'EOF'
## Summary

Description here.

## Details

- Detail 1
- Detail 2

## Acceptance Criteria

- [ ] Criterion 1
EOF
)"
```

### 5. Report Success

Display the created issue URL and number.

## Examples

**Good issue:**
```markdown
Title: Add keyboard shortcuts for common actions

## Summary

Add keyboard shortcuts for play/pause (Space), undo (Cmd+Z), and save (Cmd+S) to improve workflow efficiency.

## Acceptance Criteria

- [ ] Space toggles play/pause
- [ ] Cmd+Z/Ctrl+Z triggers undo
- [ ] Cmd+S/Ctrl+S saves the project
```

**Avoid:**
```markdown
Title: We should probably think about maybe adding some keyboard shortcuts

## Summary

I was thinking that it might be nice if we had keyboard shortcuts. Many other apps have them and users might find them useful. We could start with some basic ones and then add more later...

[Too verbose, uncertain language, no clear requirements]
```

## Error Handling

- **gh not authenticated**: Prompt user to run `gh auth login`
- **Network error**: Inform user and suggest retry
- **Empty title/description**: Ask user to provide content
