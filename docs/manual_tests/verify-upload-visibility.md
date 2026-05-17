# UAT: Activity Hub Upload Visibility & Global Control

## Purpose
Verify that the user receives real-time, context-specific feedback within the Activity Hub cards and can globally control (abort) active uploads across multiple tabs.

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
- The card displays "Synchronizing cockpit state..." or "🚀 Resuming stream: X%".
- Once the history fetch completes, the Ghost Card should seamlessly transition into the real History Card (reconciled by ID or fuzzy matching).
- No floating HUD is visible on the Dashboard or Activity Hub.

---

## Test Case 2: Distribution Phase Transitions

### Steps
1. Wait for the Staging phase from Test Case 1 to complete.
2. **Observe:** The platform pills within the card should update.

### Expected Results
- The status text updates to "📤 Uploading to [platform]...".
- The relevant platform pill (e.g., YouTube) changes its icon to a spinning/pulsing indicator.
- The "Processing Dot" remains active in the card header.

---

## Test Case 3: Global Abort (Cross-Tab)

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

## Test Case 4: Navigation Persistence

### Steps
1. Start an upload on the **Dashboard** and wait for the redirect to **Activity Hub**.
2. While the card shows active progress, navigate to the **Settings** page or **Gallery**.
3. Immediately navigate back to the **Activity Hub**.

### Expected Results
- The specific card still shows the accurate, updated progress (Processing Dot and status text).
- The state is preserved because the hook polls the global `localStorage` signal.

---

## Test Case 5: Post-Upload Cleanup

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
