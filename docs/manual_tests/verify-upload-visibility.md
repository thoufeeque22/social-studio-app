# UAT: Activity Hub Upload Visibility

## Purpose
Verify that the user receives real-time, context-specific feedback within the Activity Hub cards during the video upload (staging) and multi-platform distribution process.

## Prerequisites
- A test user account.
- One or more video files (small < 5MB and medium > 50MB).
- Access to the application in a browser.

---

## Test Case 1: Staging Progress in Activity Hub Card

### Steps
1. Navigate to the **Dashboard** (Upload page).
2. Select a medium-sized video file (> 50MB).
3. Select at least one platform.
4. Click **Launch**.
5. **Observe:** The browser should redirect to the **Activity Hub** (/history).

### Expected Results
- A new card for the post appears at the top of the timeline.
- A "Preparation Bar" is visible at the top of this card.
- The bar displays "Streaming to Cloud: X%" or "Initializing...".
- The progress bar fills smoothly according to the percentage.
- A pulse animation is visible next to the status text.

---

## Test Case 2: Distribution Phase Transitions

### Steps
1. Wait for the Staging phase from Test Case 1 to complete (bar disappears or reaches 100%).
2. **Observe:** The platform pills within the card should update.

### Expected Results
- The "Preparation Bar" disappears once staging is complete.
- The relevant platform pill (e.g., YouTube) changes its icon to a spinning/pulsing indicator.
- The pill label might change to "Distributing" or "Uploading...".
- The pill progress bar (inside the pill) fills as the distribution proceeds.

---

## Test Case 3: Navigation Persistence

### Steps
1. Start an upload on the **Dashboard** and wait for the redirect to **Activity Hub**.
2. While the card shows active progress (~50% staging), navigate to the **Settings** page or **Gallery** using the sidebar.
3. Immediately navigate back to the **Activity Hub**.

### Expected Results
- The specific card still shows the accurate, updated progress.
- No global floating HUD is visible (per design choice).

---

## Test Case 4: Manual Stop / Cancellation

### Steps
1. Start an upload and navigate to the **Activity Hub**.
2. While the card is in the "Staging" phase (Preparation Bar visible), click the red **STOP ALL** button on that specific card.
3. Verify the state in `localStorage` via the Browser DevTools (Application Tab).

### Expected Results
- The "Preparation Bar" disappears immediately.
- The card's status updates to "Stopped" or "Cancelled".
- `localStorage.getItem('SS_STAGING_STATUS')` should be null.

---

## Test Case 5: Cross-Tab Synchronization

### Steps
1. Open the application in **Tab A** and **Tab B** on the **Activity Hub** page.
2. In **Tab A**, navigate to Dashboard and start an upload.
3. Switch back to **Tab B** (Activity Hub).

### Expected Results
- **Tab B** should automatically show the new card and its live progress (Preparation Bar) synchronized with **Tab A**.
- Navigating between pages in **Tab B** should not interrupt the visibility of progress when returning to the Activity Hub.

---

## Test Case 6: Post-Upload Cleanup

### Steps
1. Allow an upload to finish completely (all distribution phases succeed).
2. **Observe** the card.

### Expected Results
- Once the distribution is finished, the platform pills show "Success" (green) with links.
- The "Processing Dot" in the card header disappears.
- `localStorage` is cleared automatically.

---

## Edge Cases to Watch For
- **Network Interruption**: Disconnect Wi-Fi during staging. The Preparation Bar should reflect the failure or eventually time out.
- **Malformed State**: Manually set `SS_STAGING_STATUS` in the console with a random `historyId`. The Activity Hub should ignore it (no Preparation Bar should appear on unrelated cards).
- **Multiple Tabs**: Open the app in two tabs. Start an upload in Tab A. Tab B should show the progress only on the matching card in the Activity Hub.
