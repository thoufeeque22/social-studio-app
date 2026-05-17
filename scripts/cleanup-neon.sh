#!/bin/bash

# Configuration
PROJECT_ID="falling-feather-78236210"
FORCE=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --force|-f) FORCE=true ;;
        --project-id|-p) PROJECT_ID="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "🔍 Fetching branches for project: $PROJECT_ID"

# Get branches
# Logic: 
# 1. List branches
# 2. Remove pipe characters used for table formatting
# 3. Filter out 'main', the header 'ID', and empty lines
# 4. Sort by the 4th column (Created At) in reverse (newest first)
# 5. Skip the first result (the most recent non-main branch)
# 6. Extract the ID/Name from the first column
BRANCHES=$(neonctl branches list --project-id "$PROJECT_ID" | sed 's/│//g' | grep -vE "main|ID|^$" | sort -r -k 4 | tail -n +2 | awk '{print $1}')

if [ -z "$BRANCHES" ]; then
    echo "✅ No old branches to delete (only 'main' and the most recent preview branch exist)."
    exit 0
fi

if [ "$FORCE" = false ]; then
    echo "🚧 DRY RUN: The following branches would be deleted:"
    echo "$BRANCHES"
    echo ""
    echo "👉 SHORTCUT: To actually delete these, run:"
    echo "   npm run cleanup:neon -- -f"
    echo ""
else
    echo "🗑️ Deleting branches..."
    for branch in $BRANCHES; do
        echo "   - Deleting: $branch"
        neonctl branches delete "$branch" --project-id "$PROJECT_ID" --force
    done
    echo "✨ Cleanup complete!"
fi
