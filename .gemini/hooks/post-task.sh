#!/bin/bash
# post-task hook: Auto-validate code before finishing

echo "🔍 Running auto-validation..."

# 1. Env Guard check
echo "  → Checking .env restrictions..."
./.gemini/hooks/env-guard.sh
ENV_EXIT=$?

# 2. Lint check
echo "  → Linting..."
npm run lint --silent
LINT_EXIT=$?

# 3. Unit test check
echo "  → Testing..."
npm run test -- --silent
TEST_EXIT=$?

if [ $ENV_EXIT -ne 0 ] || [ $LINT_EXIT -ne 0 ] || [ $TEST_EXIT -ne 0 ]; then
  echo "❌ Validation failed!"
  exit 1
fi

echo "✅ All checks passed!"
exit 0
