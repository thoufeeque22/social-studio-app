# UAT: Activity Hub Upload Visibility & Global Control

## Purpose
Verify that the user receives real-time, context-specific feedback within the Activity Hub cards and can globally or granularly control (abort) active uploads.

## Prerequisites
- A test user account.
- One or more video files (small < 5MB and medium > 50MB).
- Access to the application in multiple browser tabs.

---

## Test Case 1: Immediate Redirect & Optimistic Ghost Card

### Steps
1. Navigate to the **Dashboard** (Upload page).
2. Select a medium-sized video file (> 50MB).
3. Select at least one platform.
4. Click **Launch** or **Post Video**.
5. **Observe:** The browser should redirect to the **Activity Hub** (/history) *immediately*.
6. **Simulate Delay:** In the Network tab of DevTools, set "Throttling" to "Slow 3G" right after the redirect to simulate a slow database fetch for the history list.

### Expected Results
- Immediate redirect to `/history`.
- **Optimistic UI:** A "Ghost Card" (skeleton/placeholder) appears at the top of the timeline *before* the real history record is fetched.
- **Persistence:** Even if the history list fetch takes several seconds (due to throttling), the Ghost Card MUST persist and continue showing real-time progress from `localStorage`. It should not flicker or disappear between polling cycles.
- A "Processing Dot" (pulsing blue/primary) is visible on this Ghost Card.
- The card displays technical status messages like "Synchronizing cockpit state..." or "Resuming stream: X%".
- **Emoji Audit:** Verify that NO emojis are present in any status text (e.g., no rocket, no cloud, no checkmarks).
- Once the history fetch completes, the Ghost Card should seamlessly transition into the real History Card (reconciled by ID or fuzzy matching).
- No floating HUD is visible on the Dashboard or Activity Hub.

---

## Test Case 2: Optimistic Individual Platform Cancellation (Instant Feedback)

### Steps
1. Follow Steps 1-4 from Test Case 1.
2. While the **Ghost Card** is visible (and before the real record arrives), identify the platform pills showing "In Queue".
3. Click the "X" or cancellation icon on one of the platform pills (e.g., YouTube).
4. **Observe:** The pill should update to a "Stopped" state *immediately* (within < 100ms).
5. Wait for the real record to arrive (remove throttling if necessary).

### Expected Results
- The individual platform cancellation MUST be reflected **instantly** on the Ghost Card without waiting for a database poll.
- Once the real record arrives, it MUST respect the cancellation (the platform should show as "Stopped").
- This verifies that `cancelledIds` state and `cancelPlatformByPostAction` are working in tandem.

---

## Test Case 7: UI Layering & Click Response

### Steps
1. Start an upload and wait for the "Initializing..." progress bar to appear on the card.
2. While the progress bar is active and animated, attempt to click the **STOP ALL** button.
3. Hover over the platform pills and the button.

### Expected Results
- Hover effects (opacity/color change) MUST work correctly, indicating the elements are on top of the progress bar.
- Clicking the button MUST trigger the cancellation flow immediately.
- The progress bar should not "swallow" or block the click event.

---

## Test Case 3: Distribution Phase Transitions & Granular Control

### Steps
1. Wait for the Staging phase to complete.
2. **Observe:** The platform pills within the card should update.
3. Attempt to cancel a platform during the "Initializing" or "Uploading" stage of distribution.

### Expected Results
- The status text updates to "Uploading to [platform]...".
- The relevant platform pill (e.g., YouTube) changes its icon to a spinning/pulsing indicator.
- The "Processing Dot" remains active in the card header.
- Granular cancellation works: cancelling one platform does not stop others or the overall processing dot if other platforms are still active.

---

## Test Case 4: Global Abort (Cross-Tab)

### Steps
1. Open **Tab A** on the Dashboard and start a medium upload.
2. Wait for the redirect to Activity Hub in **Tab A**.
3. Open **Tab B** on the Dashboard (verify it shows "Uploading..." in its internal state if it was the source, or just observe).
4. In **Tab A** (Activity Hub), click the red **STOP ALL** button on the active card.
5. Quickly switch to **Tab B**.

### Expected Results
- In **Tab A**: The processing dot disappears, and the status updates to "Stopped".
- In **Tab B**: The Dashboard state should reset (Upload button becomes active again, "Processing..." text disappears) because it received the global abort signal via `localStorage`.
- Background network requests (check DevTools Network tab) should be cancelled.

---

## Test Case 5: Navigation Persistence

### Steps
1. Start an upload on the **Dashboard** and wait for the redirect to **Activity Hub**.
2. While the card shows active progress, navigate to the **Settings** page or **Gallery**.
3. Immediately navigate back to the **Activity Hub**.

### Expected Results
- The specific card still shows the accurate, updated progress (Processing Dot and status text).
- The state is preserved because the hook polls the global `localStorage` signal.

---

## Test Case 6: Post-Upload Cleanup

### Steps
1. Allow an upload to finish completely (all distribution phases succeed).
2. **Observe** the card.

### Expected Results
- Once the distribution is finished, the platform pills show "Success" (green) with links.
- The "Processing Dot" in the card header disappears.
- The **STOP ALL** button is removed from the card.
- `localStorage` is cleared automatically.

---

## Edge Cases to Watch For
- **Network Interruption**: Disconnect Wi-Fi during staging. The card should reflect the failure (red text) and the Processing Dot should stop.
- **Multiple Concurrent Uploads**: (If supported) Start two uploads. Each card should have its own "STOP ALL" and Processing Dot, controlled independently.
- **Refresh during Staging**: Refresh the page while "Streaming to Cloud" is at 50%. The Activity Hub should resume showing progress immediately upon load.
