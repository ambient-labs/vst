# DeepSource Issues Skill

Use this skill when the user shares a DeepSource URL and wants to understand or fix the reported issues.

## DeepSource URL Patterns

DeepSource analysis run URLs follow this pattern:
```
https://app.deepsource.com/gh/{owner}/{repo}/run/{run-uuid}/{analyzer}/
```

Example:
```
https://app.deepsource.com/gh/ambient-labs/vst/run/3ee9511d-866d-4582-8e48-23a84903e172/javascript/
```

## How to Read DeepSource Issues

### Option 1: Use the DeepSource GraphQL API

DeepSource provides a GraphQL API at `https://api.deepsource.io/graphql/`.

**Authentication:** Requires a Personal Access Token (PAT) passed as Bearer token.

**Query to fetch issues from a specific run:**

```graphql
query GetRunIssues($runUid: UUID!) {
  run(runUid: $runUid) {
    runUid
    status
    branchName
    commitOid
    summary {
      introducedOccurrences
      resolvedOccurrences
      suppressedOccurrences
    }
    checks {
      edges {
        node {
          analyzer {
            shortcode
            name
          }
        }
      }
    }
  }
}
```

**Query to fetch repository issues:**

```graphql
query GetRepositoryIssues($name: String!, $login: String!, $vcsProvider: VCSProvider!) {
  repository(name: $name, login: $login, vcsProvider: $vcsProvider) {
    name
    defaultBranch
    issues(first: 50) {
      totalCount
      edges {
        node {
          id
          issue {
            shortcode
            title
            category
            severity
            shortDescription
            analyzer {
              shortcode
              name
            }
          }
          occurrences(first: 10) {
            edges {
              node {
                path
                beginLine
                endLine
              }
            }
          }
        }
      }
    }
  }
}
```

### Option 2: Check GitHub PR for DeepSource Comments

DeepSource often posts comments on PRs with issue details. Use:

```bash
gh pr view <pr-number> --comments
```

Or fetch PR review comments:

```bash
gh api repos/{owner}/{repo}/pulls/{pr-number}/comments
```

### Option 3: Check CI Logs

DeepSource analysis results appear in GitHub Actions logs:

```bash
gh run view <run-id> --log
```

## Issue Types

DeepSource categorizes issues by:

**Categories:**
- `ANTI_PATTERN` - Code anti-patterns
- `BUG_RISK` - Potential bugs
- `SECURITY` - Security vulnerabilities
- `PERFORMANCE` - Performance issues
- `STYLE` - Code style issues
- `DOCUMENTATION` - Documentation issues
- `COVERAGE` - Test coverage issues

**Severities:**
- `CRITICAL`
- `MAJOR`
- `MINOR`

## Common JavaScript/TypeScript Issues

| Shortcode | Title | Fix |
|-----------|-------|-----|
| `JS-0002` | Expected '===' but found '==' | Use strict equality |
| `JS-0050` | No unused variables | Remove or use the variable |
| `JS-0097` | No console statements | Remove console.log |
| `JS-0361` | Prefer for-of loop | Use `for (const x of arr)` |
| `JS-0377` | No explicit any | Add proper types |
| `JS-W1032` | Unhandled promise rejection | Add error handling |

## Running DeepSource Locally

Run DeepSource analysis locally before pushing to catch issues early:

### Install the CLI

```bash
curl https://deepsource.io/cli | sh
```

This installs the `deepsource` binary to `./bin/deepsource`.

### Run Local Analysis

```bash
# Run JavaScript/TypeScript analysis
./bin/deepsource report --analyzer javascript

# Run with specific analyzers
./bin/deepsource report --analyzer javascript --analyzer test-coverage
```

### Requirements

- The repository must have a `.deepsource.toml` configuration file
- The `DEEPSOURCE_DSN` environment variable must be set (sourced from `.env`)

### Benefits of Local Analysis

- Catch issues before pushing
- Faster feedback than waiting for CI
- Fix problems before they appear in PR reviews

## Workflow for Fixing DeepSource Issues

1. **Parse the URL** to extract:
   - Repository: `{owner}/{repo}`
   - Run UUID: `{run-uuid}`
   - Analyzer: `{analyzer}` (e.g., `javascript`, `python`)

2. **Fetch issue details** using one of the methods above

3. **For each issue:**
   - Read the file at the reported path and line
   - Understand the issue from the shortcode/description
   - Apply the appropriate fix
   - Verify the fix doesn't break functionality

4. **Run local checks:**
   ```bash
   pnpm run lint
   pnpm run test:integration
   pnpm run build
   ```

5. **Commit and push** to trigger a new DeepSource analysis

## Example: Parsing a DeepSource URL

Given URL: `https://app.deepsource.com/gh/ambient-labs/vst/run/3ee9511d-866d-4582-8e48-23a84903e172/javascript/`

Extract:
- Owner: `ambient-labs`
- Repo: `vst`
- Run UUID: `3ee9511d-866d-4582-8e48-23a84903e172`
- Analyzer: `javascript`

Then query the API or check the associated PR/commit for detailed issue information.

## Rate Limits

DeepSource API has a rate limit of 5,000 requests per hour per user. HTTP 429 is returned when exceeded.

## References

- [DeepSource API Overview](https://docs.deepsource.com/docs/developers/api/index)
- [Repository API](https://docs.deepsource.com/docs/developers/api/repository)
- [Analysis Run API](https://docs.deepsource.com/docs/developers/api/analysis-run)
- [Issue API](https://docs.deepsource.com/docs/developers/api/issue)
