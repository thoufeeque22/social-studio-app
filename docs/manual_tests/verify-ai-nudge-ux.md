# Manual Test: AI Nudge UX Verification

## Prerequisites
- A browser with clear `localStorage` or a Private/Incognito window.
- Application running locally.

## Test Case 1: Initial Visibility and Interaction

### Steps
1. Navigate to a page where an `AINudge` is implemented (e.g., Schedule page or Post Creator).
2. Verify that the AI Nudge (pill-shaped badge with "sparkles" icon) is visible.
3. Observe the pulse animation to ensure it is subtle and not distracting.
4. Hover over the nudge and verify the tooltip text appears.
5. Click on the nudge (not the close icon).
6. Verify that the associated action (if any) is triggered (e.g., opens a chat drawer or scrolls to a feature).

### Expected Results
- Nudge is visible on first load.
- Animation is smooth.
- Tooltip displays correctly.
- Clicking the nudge triggers the expected callback.

## Test Case 2: Dismissal and Persistence

### Steps
1. Locate an AI Nudge.
2. Click the small "X" (Close) icon on the right side of the nudge.
3. Verify the nudge immediately disappears from the UI.
4. Refresh the page.
5. Verify the nudge remains hidden.
6. Open browser DevTools, go to **Application** -> **Local Storage**, and verify a key named `ai_nudge_dismissed_<featureKey>` exists with the value `"true"`.

### Expected Results
- Nudge disappears upon clicking close.
- Nudge does not reappear after refresh.
- LocalStorage state is correctly set.

## Test Case 3: Multiple Features Independence

### Steps
1. Identify two different AI Nudges with different `featureKey` values.
2. Dismiss one nudge.
3. Verify that the other nudge remains visible.
4. Refresh the page and verify the state of both nudges is preserved.

### Expected Results
- Dismissing one nudge does not affect others.
- Each nudge tracks its own dismissal state independently.
