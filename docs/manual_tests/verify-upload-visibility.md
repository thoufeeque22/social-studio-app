# UAT: Upload Visibility & HUD Feedback

## Purpose
Verify that the user receives continuous, clear, and accurate feedback during the video upload (staging) and multi-platform distribution process.

## Prerequisites
- A test user account.
- One or more video files (small < 5MB and medium > 50MB).
- Access to the application in a browser.

---

## Test Case 1: Staging Progress Visibility

### Steps
1. Navigate to the **Dashboard** (Upload page).
2. Select a medium-sized video file (> 50MB).
3. Select at least one platform.
4. Click **Launch**.
5. **Observe:** The `UploadHUD` should appear at the bottom of the screen.

### Expected Results
- The HUD displays "Streaming to Cloud: X%".
- The progress bar (MUI LinearProgress) fills smoothly according to the percentage.
- A pulse animation is visible next to the "Current Progress" label.
- The percentage increments as chunks are successfully uploaded.

---

## Test Case 2: Distribution Phase Transitions

### Steps
1. Wait for the Staging phase from Test Case 1 to reach 99%.
2. **Observe:** The status text in the HUD should change.

### Expected Results
- Status should change to "Finalizing for launch..." briefly.
- Then, it should change to "Uploading to [Platform Name]..." (e.g., "Uploading to youtube...").
- The progress bar may become indeterminate if percentage data is not available for distribution, or stay at 99%/100% depending on implementation.

---

## Test Case 3: Global Persistence

### Steps
1. Start an upload on the **Dashboard**.
2. While the upload is at ~50%, navigate to the **History** page or **Settings** page using the sidebar.

### Expected Results
- The `UploadHUD` remains visible at the bottom of the screen across different routes.
- The progress continues to update accurately.

---

## Test Case 4: Manual Stop / Cancellation

### Steps
1. Start an upload.
2. While the HUD is active, click the red **STOP ALL** button in the HUD.
3. Verify the state in `localStorage` via the Browser DevTools (Application Tab).

### Expected Results
- The `UploadHUD` disappears immediately with a slide-down animation.
- `localStorage.getItem('SS_STAGING_STATUS')` should be null.
- (Optional) Check network tab: active chunk requests should be cancelled (if AbortController is integrated).

---

## Test Case 5: Cross-Tab Synchronization

### Steps
1. Open the application in **Tab A** and **Tab B**.
2. Start an upload in **Tab A**.
3. Switch to **Tab B**.

### Expected Results
- **Tab B** should also show the `UploadHUD` with identical progress and status as **Tab A**.
- Navigating between pages in **Tab B** should not interrupt the HUD visibility.

---

## Test Case 6: Post-Upload Cleanup

### Steps
1. Allow an upload to finish completely (all distribution phases succeed).
2. **Observe** the HUD.

### Expected Results
- Once the distribution is finished and the user is redirected or the success state is reached, the HUD should automatically disappear.
- Navigating to other pages should confirm the HUD is no longer present.

---

## Edge Cases to Watch For
- **Network Interruption**: Disconnect Wi-Fi during upload. The HUD should reflect the failure (if the utility broadcasts the error) or eventually time out.
- **Malformed State**: Manually set `SS_STAGING_STATUS` in the console to `{ "active": true, "status": "corrupt" }` (missing percent). The HUD should render gracefully with an indeterminate progress bar or just the status text.
- **Multiple Tabs**: Open the app in two tabs. Start an upload in Tab A. Tab B should also show the `UploadHUD` with the same progress (Global State sync).
