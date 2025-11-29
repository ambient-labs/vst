#!/bin/bash
#
# Pre-commit code review hook for Claude Code
#
# This hook intercepts git commit commands and performs automated code review
# on staged changes. It blocks commits with security issues and warns about
# code quality and hygiene concerns.
#
# Checks performed:
#   BLOCKING (security):
#     - Hardcoded secrets/credentials
#     - eval() usage, innerHTML assignment, dangerouslySetInnerHTML
#     - Shell command injection, SQL injection patterns
#
#   WARNINGS (code quality):
#     - console.log() in non-test files
#     - TODO/FIXME comments, eslint-disable, @ts-ignore
#     - Large changes (500+ lines)
#
#   WARNINGS (code hygiene):
#     - Missing .js extension in local imports
#     - Node.js built-ins without node: protocol
#     - New JavaScript files (should be TypeScript)
#     - Default exports (prefer named exports)
#     - npm usage (should use pnpm)
#     - Test files in wrong location
#
# Input: JSON via stdin containing the tool call details
# Output: Messages to stderr for Claude to see
#
# Exit codes:
#   0 - Allow the operation to proceed
#   2 - Block the operation (stderr message sent to Claude)

# Read the input JSON from stdin
INPUT=$(cat)

# Extract the command
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Determine the git directory from -C flag or use project dir
if [[ "$COMMAND" =~ git[[:space:]]+-C[[:space:]]+([^[:space:]]+) ]]; then
  GIT_DIR="${BASH_REMATCH[1]}"
else
  GIT_DIR="${CLAUDE_PROJECT_DIR:-.}"
fi

# Check if there are staged changes
STAGED_FILES=$(git -C "$GIT_DIR" diff --cached --name-only 2>/dev/null)
if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

# Get the staged diff, excluding this hook script and other shell/config files
# This prevents false positives from regex patterns in the script itself
DIFF=$(git -C "$GIT_DIR" diff --cached -- ':!*.sh' ':!*.json' ':!*.md' 2>/dev/null)
DIFF_LINES=$(echo "$DIFF" | wc -l)

# Skip if no code files changed (only config/docs)
if [[ "$DIFF_LINES" -lt 5 ]]; then
  exit 0
fi

# Filter staged files to only code files for checks
CODE_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx|py|cpp|h|c)$' || true)
if [[ -z "$CODE_FILES" ]]; then
  # No code files, skip detailed review
  exit 0
fi

# Track blocking vs warning issues
BLOCKING_ISSUES=""
WARNINGS=""

#
# BLOCKING CHECKS - These will prevent the commit
#

# Check for hardcoded secrets/credentials
if echo "$DIFF" | grep -E '^\+.*(password|secret|api_key|apikey|private_key)[[:space:]]*[:=][[:space:]]*["\x27][^"\x27]{8,}["\x27]' -i >/dev/null 2>&1; then
  BLOCKING_ISSUES="${BLOCKING_ISSUES}\n  - SECURITY: Possible hardcoded secret/credential detected"
fi

# Check for AWS keys pattern
if echo "$DIFF" | grep -E '^\+.*(AKIA[0-9A-Z]{16}|[0-9a-zA-Z/+]{40})' >/dev/null 2>&1; then
  BLOCKING_ISSUES="${BLOCKING_ISSUES}\n  - SECURITY: Possible AWS credential detected"
fi

# Check for eval() usage (security risk)
if echo "$DIFF" | grep -E '^\+[^/]*[^a-zA-Z]eval\s*\(' >/dev/null 2>&1; then
  # Exclude test files
  EVAL_FILES=$(echo "$STAGED_FILES" | grep -v '\.test\.' | grep -v '__tests__' | grep -v 'spec\.')
  if [[ -n "$EVAL_FILES" ]]; then
    BLOCKING_ISSUES="${BLOCKING_ISSUES}\n  - SECURITY: eval() usage detected - potential code injection risk"
  fi
fi

# Check for innerHTML assignment (XSS risk)
if echo "$DIFF" | grep -E '^\+.*\.innerHTML\s*=' >/dev/null 2>&1; then
  BLOCKING_ISSUES="${BLOCKING_ISSUES}\n  - SECURITY: innerHTML assignment detected - potential XSS vulnerability"
fi

# Check for dangerouslySetInnerHTML without sanitization context
if echo "$DIFF" | grep -E '^\+.*dangerouslySetInnerHTML' >/dev/null 2>&1; then
  BLOCKING_ISSUES="${BLOCKING_ISSUES}\n  - SECURITY: dangerouslySetInnerHTML usage - ensure content is sanitized"
fi

# Check for shell command injection patterns
if echo "$DIFF" | grep -E '^\+.*(exec|execSync|spawn|spawnSync)\s*\([^)]*\$\{' >/dev/null 2>&1; then
  BLOCKING_ISSUES="${BLOCKING_ISSUES}\n  - SECURITY: Possible command injection - variable interpolation in shell command"
fi

# Check for SQL injection patterns
if echo "$DIFF" | grep -E "^\+.*\.(query|execute)\s*\(['\"\`].*\\\$\{" >/dev/null 2>&1; then
  BLOCKING_ISSUES="${BLOCKING_ISSUES}\n  - SECURITY: Possible SQL injection - use parameterized queries"
fi

#
# WARNING CHECKS - These will be reported but won't block
#

# Check for console.log (except in test files)
if echo "$DIFF" | grep -E '^\+.*console\.(log|debug|info)\(' >/dev/null 2>&1; then
  # Check if any non-test files have console statements
  NON_TEST_CONSOLE=$(echo "$STAGED_FILES" | grep -v '\.test\.' | grep -v '__tests__' | grep -v 'spec\.' | head -1)
  if [[ -n "$NON_TEST_CONSOLE" ]]; then
    WARNINGS="${WARNINGS}\n  - Debugging console.log() found - consider removing before commit"
  fi
fi

# Check for TODO/FIXME being added
if echo "$DIFF" | grep -E '^\+.*(TODO|FIXME|HACK|XXX):' >/dev/null 2>&1; then
  WARNINGS="${WARNINGS}\n  - TODO/FIXME comments being added - consider addressing"
fi

# Check for eslint-disable
if echo "$DIFF" | grep -E '^\+.*eslint-disable' >/dev/null 2>&1; then
  WARNINGS="${WARNINGS}\n  - ESLint rules being disabled - ensure this is intentional"
fi

# Check for @ts-ignore
if echo "$DIFF" | grep -E '^\+.*@ts-ignore' >/dev/null 2>&1; then
  WARNINGS="${WARNINGS}\n  - @ts-ignore being added - consider fixing the type error"
fi

# Check for very large changes
ADDITIONS=$(echo "$DIFF" | grep -c '^\+' || echo "0")
if [[ "$ADDITIONS" -gt 500 ]]; then
  WARNINGS="${WARNINGS}\n  - Large change ($ADDITIONS lines added) - consider smaller commits"
fi

#
# CODE HYGIENE CHECKS - Warnings for style guideline violations
#

# Get TypeScript/JavaScript files for hygiene checks
TS_JS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [[ -n "$TS_JS_FILES" ]]; then
  # Check for missing .js extension in local imports (TypeScript files)
  # Pattern: import from './foo' or import from '../foo' without extension
  TS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx)$' || true)
  if [[ -n "$TS_FILES" ]]; then
    if echo "$DIFF" | grep -E "^\+.*from\s+['\"]\.\.?/[^'\"]+[^.][^j][^s]['\"]" >/dev/null 2>&1; then
      # More precise check: local imports without .js extension
      if echo "$DIFF" | grep -E "^\+.*from\s+['\"]\./" | grep -v "\.js['\"]" | grep -v "\.jsx['\"]" | grep -v "\.json['\"]" | grep -v "\.css['\"]" >/dev/null 2>&1; then
        WARNINGS="${WARNINGS}\n  - HYGIENE: Local imports should include .js extension (TypeScript resolves .ts to .js)"
      fi
    fi
  fi

  # Check for Node.js built-ins without node: protocol
  # Common built-ins that should use node: prefix
  if echo "$DIFF" | grep -E "^\+.*from\s+['\"]($|fs|path|os|url|util|crypto|http|https|stream|events|buffer|child_process|assert)['\"]" >/dev/null 2>&1; then
    WARNINGS="${WARNINGS}\n  - HYGIENE: Node.js built-ins should use node: protocol (e.g., 'node:fs' not 'fs')"
  fi

  # Check for new JavaScript files (should be TypeScript)
  NEW_JS_FILES=$(echo "$STAGED_FILES" | grep -E '\.js$' | while read -r file; do
    # Check if file is newly added (not modified)
    if git -C "$GIT_DIR" diff --cached --diff-filter=A --name-only | grep -q "^${file}$"; then
      echo "$file"
    fi
  done)
  if [[ -n "$NEW_JS_FILES" ]]; then
    WARNINGS="${WARNINGS}\n  - HYGIENE: New files should be TypeScript (.ts/.tsx), not JavaScript (.js/.jsx)"
  fi

  # Check for default exports (prefer named exports)
  if echo "$DIFF" | grep -E '^\+\s*export\s+default\s+' >/dev/null 2>&1; then
    # Exclude React components which commonly use default exports
    if echo "$DIFF" | grep -E '^\+\s*export\s+default\s+' | grep -v 'function\s+[A-Z]' | grep -v 'class\s+[A-Z]' | grep -v 'memo(' >/dev/null 2>&1; then
      WARNINGS="${WARNINGS}\n  - HYGIENE: Prefer named exports over default exports for better refactoring"
    fi
  fi
fi

# Check for npm usage (should use pnpm)
if echo "$DIFF" | grep -E '^\+.*(npm\s+(install|i|add|run|exec|ci)\s|"npm":|npm\s+--version)' >/dev/null 2>&1; then
  WARNINGS="${WARNINGS}\n  - HYGIENE: Use pnpm instead of npm for package management"
fi

# Check for test files in wrong location
# Unit tests should be colocated (*.test.ts next to source)
# Integration tests should be in tests/ directory
NEW_TEST_FILES=$(echo "$STAGED_FILES" | grep -E '\.test\.(ts|tsx|js|jsx)$' || true)
if [[ -n "$NEW_TEST_FILES" ]]; then
  # Check for test files in tests/ that look like unit tests (testing a single module)
  MISPLACED_UNIT=$(echo "$NEW_TEST_FILES" | grep '^tests/' | grep -v 'integration' | grep -v 'e2e' || true)
  if [[ -n "$MISPLACED_UNIT" ]]; then
    WARNINGS="${WARNINGS}\n  - HYGIENE: Unit tests should be colocated with source files, not in tests/"
  fi
fi

#
# OUTPUT RESULTS
#

FILE_COUNT=$(echo "$CODE_FILES" | wc -l)

# If blocking issues found, block the commit
if [[ -n "$BLOCKING_ISSUES" ]]; then
  cat >&2 << EOF

╔═══════════════════════════════════════════════════════════════════════╗
║                    PRE-COMMIT CODE REVIEW - BLOCKED                   ║
╚═══════════════════════════════════════════════════════════════════════╝

Reviewing: $FILE_COUNT file(s), $DIFF_LINES lines

BLOCKING ISSUES (must fix before committing):
$(echo -e "$BLOCKING_ISSUES")

Files reviewed:
$(echo "$CODE_FILES" | sed 's/^/  /')

To fix: Address the security issues above, then try committing again.

EOF
  exit 2
fi

# If only warnings, report them but allow the commit
if [[ -n "$WARNINGS" ]]; then
  cat >&2 << EOF

┌───────────────────────────────────────────────────────────────────────┐
│                    PRE-COMMIT CODE REVIEW - PASSED                    │
└───────────────────────────────────────────────────────────────────────┘

Reviewing: $FILE_COUNT file(s), $DIFF_LINES lines

Warnings (non-blocking):
$(echo -e "$WARNINGS")

Proceeding with commit...

EOF
fi

# Allow the commit
exit 0
