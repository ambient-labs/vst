#!/bin/bash
#
# Pre-commit hook that runs the same checks as CI
#
# This ensures local commits pass CI before pushing.
# Checks run in parallel where possible for speed.
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed (commit blocked)
#
# Environment variables:
#   SKIP_PRE_COMMIT=1 - Skip all pre-commit checks

set -e

# Check for skip flag
if [[ "${SKIP_PRE_COMMIT:-}" == "1" ]]; then
  echo "Skipping pre-commit checks (SKIP_PRE_COMMIT=1)"
  exit 0
fi

# Get the git directory (support for worktrees)
GIT_DIR=$(git rev-parse --show-toplevel)
cd "$GIT_DIR"

# Get staged files (Added, Copied, Modified, Renamed - excluding deleted)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                         PRE-COMMIT CHECKS                             ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Categorize staged files for path filtering (matches CI workflow filters)
STAGED_CODE=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)
STAGED_CPP=$(echo "$STAGED_FILES" | grep -E '\.(cpp|h|c)$' || true)
STAGED_OTHER=$(echo "$STAGED_FILES" | grep -E '\.(json|css|md)$' || true)

# Frontend: packages/frontend/src/**, vitest config, package.json
STAGED_FRONTEND=$(echo "$STAGED_FILES" | grep -E '^packages/frontend/(src/|vitest\.unit\.config\.ts|package\.json)' || true)

# DSP: packages/dsp/**/*.{js,ts}, vitest config, package.json
STAGED_DSP=$(echo "$STAGED_FILES" | grep -E '^packages/dsp/(.*\.(js|ts)|vitest\.unit\.config\.ts|package\.json)' || true)

# Integration: tests/**, vitest.integration.config.ts
STAGED_TESTS=$(echo "$STAGED_FILES" | grep -E '^(tests/|vitest\.integration\.config\.ts)' || true)

# Native: native/**
STAGED_NATIVE=$(echo "$STAGED_FILES" | grep -E '^native/' || true)

# Root deps: package.json, pnpm-lock.yaml (triggers all checks)
STAGED_DEPS=$(echo "$STAGED_FILES" | grep -E '^(package\.json|pnpm-lock\.yaml)$' || true)

# Track failures
FAILED_CHECKS=""
PIDS=""

# Temporary directory for parallel job outputs
TMPDIR="${TMPDIR:-/tmp/claude}"
mkdir -p "$TMPDIR"

#
# STEP 1: Lint and format staged files (must complete first to re-stage)
#

if [[ -n "$STAGED_CODE" ]]; then
  echo "▶ Running ESLint on staged files..."
  CODE_FILES=$(echo "$STAGED_CODE" | tr '\n' ' ')

  if ! pnpm exec eslint --fix $CODE_FILES; then
    echo "✗ ESLint failed"
    FAILED_CHECKS="${FAILED_CHECKS}eslint "
  else
    echo "✓ ESLint passed"
  fi
fi

ALL_STAGED="$STAGED_CODE $STAGED_OTHER"
ALL_STAGED=$(echo "$ALL_STAGED" | xargs)

if [[ -n "$ALL_STAGED" ]]; then
  echo "▶ Running Prettier on staged files..."
  FILES_FOR_PRETTIER=$(echo "$ALL_STAGED" | tr '\n' ' ')

  if ! pnpm exec prettier --write $FILES_FOR_PRETTIER; then
    echo "✗ Prettier failed"
    FAILED_CHECKS="${FAILED_CHECKS}prettier "
  else
    echo "✓ Prettier passed"
  fi

  # Re-stage files that were modified
  echo "$ALL_STAGED" | xargs git add
fi

# If lint/format failed, stop here
if [[ -n "$FAILED_CHECKS" ]]; then
  echo ""
  echo "Pre-commit checks failed: $FAILED_CHECKS"
  exit 1
fi

#
# STEP 2: Run tests and security checks in parallel
#

echo ""
echo "Running checks in parallel..."
echo ""

# Function to run a check and capture result
run_check() {
  local name=$1
  local cmd=$2
  local outfile="$TMPDIR/precommit-$name.log"

  echo "▶ Starting $name..."
  if eval "$cmd" > "$outfile" 2>&1; then
    echo "✓ $name passed"
    return 0
  else
    echo "✗ $name failed (see output below)"
    return 1
  fi
}

# Unit tests - frontend (if frontend source or deps changed)
if [[ -n "$STAGED_FRONTEND" ]] || [[ -n "$STAGED_DEPS" ]]; then
  run_check "unit-tests-frontend" "pnpm --filter frontend test:unit" &
  PIDS="$PIDS $!"
fi

# Unit tests - DSP (if DSP source or deps changed)
if [[ -n "$STAGED_DSP" ]] || [[ -n "$STAGED_DEPS" ]]; then
  run_check "unit-tests-dsp" "pnpm --filter dsp test:unit" &
  PIDS="$PIDS $!"
fi

# Integration tests (if DSP, tests, or deps changed)
if [[ -n "$STAGED_DSP" ]] || [[ -n "$STAGED_TESTS" ]] || [[ -n "$STAGED_DEPS" ]]; then
  run_check "integration-tests" "pnpm run test:integration" &
  PIDS="$PIDS $!"
fi

# Semgrep security scan (if code files changed)
if [[ -n "$STAGED_CODE" ]] || [[ -n "$STAGED_CPP" ]]; then
  # Check if Docker is available
  if command -v docker &> /dev/null; then
    run_check "semgrep" "pnpm run semgrep" &
    PIDS="$PIDS $!"
  else
    echo "⚠ Skipping Semgrep (Docker not available)"
  fi
fi

# Native build (if native code or deps changed)
if [[ -n "$STAGED_NATIVE" ]] || [[ -n "$STAGED_DEPS" ]]; then
  run_check "native-build" "pnpm run build-native" &
  PIDS="$PIDS $!"
fi

# Wait for all parallel checks
if [[ -n "$PIDS" ]]; then
  for pid in $PIDS; do
    if ! wait $pid; then
      FAILED_CHECKS="${FAILED_CHECKS}(pid:$pid) "
    fi
  done
fi

#
# STEP 3: Report results
#

echo ""
if [[ -n "$FAILED_CHECKS" ]]; then
  echo "╔═══════════════════════════════════════════════════════════════════════╗"
  echo "║                      PRE-COMMIT CHECKS FAILED                         ║"
  echo "╚═══════════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Failed checks: $FAILED_CHECKS"
  echo ""
  echo "Check the output above for details."
  echo "To skip checks (not recommended): SKIP_PRE_COMMIT=1 git commit ..."
  exit 1
else
  echo "╔═══════════════════════════════════════════════════════════════════════╗"
  echo "║                      PRE-COMMIT CHECKS PASSED                         ║"
  echo "╚═══════════════════════════════════════════════════════════════════════╝"
  exit 0
fi
