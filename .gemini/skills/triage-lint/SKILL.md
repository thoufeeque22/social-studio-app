---
name: triage-lint
description: Protocol for handling large sets of lint errors (e.g., >10 errors). Prevents agents from attempting to fix everything in one go.
---

# Triage Lint Protocol

When encountering a large number of lint errors (e.g., >10 errors), DO NOT attempt to fix all at once.

## Rules
1. **Batching:** Fix a maximum of 5-10 errors per turn.
2. **Prioritization:**
   - Priority 1: High-severity errors (runtime risks, security).
   - Priority 2: Regressions introduced in the current session.
   - Priority 3: Systemic errors that can be fixed with a single rule change or global search-replace (e.g., `Date.now()` vs `new Date().getTime()`).
3. **Categorization:** Group errors by file or directory to keep the implementation focused.
4. **Handoff & Report:**
   - Update the calling agent's namespaced key in `.gemini_agent_context.json` with the current lint status (e.g., `"lint_errors_fixed": 8`, `"remaining_errors": 42`).
   - Provide a concise summary of what was fixed.
   - List the remaining error count.
   - Suggest which file/batch to tackle next.

## Workflow
1. Analyze the lint output (e.g., `lint_output.txt`).
2. Select a target batch of 5-10 errors.
3. Apply fixes only for that batch.
4. Run `npm run lint` or the project-specific lint command to verify the batch fix.
5. Report progress to the user.
