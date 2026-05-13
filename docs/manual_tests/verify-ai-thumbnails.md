# Manual Test: AI Thumbnail Suggestions

## 1. Prerequisites
- Authenticated user account with at least one uploaded video.
- API keys for the Vision model are configured in the environment (`.env`).
- Redis instance for rate limiting is active.

## 2. Test Scenarios

### A. Happy Path: Successful Generation
1. **Navigate:** Go to the Media Library.
2. **Action:** Select a video (10+ seconds).
3. **Trigger:** Click the "Auto-Generate Thumbnails" button.
4. **Expected Result:**
   - Skeleton loader displays.
   - Within 5-15 seconds, 3-4 thumbnail suggestions appear.
   - UI shows a "Reasoning" tooltip for the top pick.

### B. Edge Case: Video Too Short
1. **Navigate:** Select a video < 2 seconds.
2. **Action:** Click "Auto-Generate Thumbnails".
3. **Expected Result:**
   - Toast notification: "Video too short for thumbnail generation."

### C. Negative Path: Rate Limiting
1. **Navigate:** Trigger thumbnail generation 10 times consecutively (exceeding limit).
2. **Expected Result:**
   - 11th request returns a 429 status code.
   - UI displays an error: "Generation limit reached. Please try again tomorrow."

### D. System Failure: API Timeout
1. **Navigate:** Simulate AI API outage.
2. **Action:** Click "Auto-Generate Thumbnails".
3. **Expected Result:**
   - Graceful fallback: System shows "Unable to generate suggestions" without breaking the UI.
   - Check Sentry logs for API failure capture.
