#!/bin/bash
# env-guard hook: Restrict agent access to .env files

# Check for .env modifications or reads in recent operations
# Since we don't have a direct "access log", we can check if the agent 
# is attempting to modify .env files during its task.

MODIFIED_ENV=$(git status --porcelain | grep "\.env")

if [ ! -z "$MODIFIED_ENV" ]; then
  echo "❌ Error: Agent attempted to modify .env files!"
  echo "Files: $MODIFIED_ENV"
  echo "Manual intervention required for secret management."
  exit 1
fi

echo "✅ Env guard passed."
exit 0
