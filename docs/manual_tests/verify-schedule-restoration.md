# UAT: Schedule & History Restoration

## Purpose
Verify that the schedule functionality is fully restored, showing upcoming posts and historical published posts with correct filtering and ordering.

## Prerequisites
- A test user account.
- Multiple connected platform accounts (or Local mock accounts).
- Access to the application UI and database.

---

## Test Case 1: Scheduling a Post

### Steps
1. Navigate to the **Upload** page.
2. Select a video and upload it.
3. In the metadata section, select **Schedule for later**.
4. Set a date/time in the future (e.g., 1 hour from now).
5. Select at least one platform account.
6. Click **Launch**.

### Expected Results
- The post is successfully created.
- The user is redirected to the **History** or **Schedule** tab.
- The new post appears under the **Upcoming/Scheduled** section.
- Database: `PostHistory` record has `scheduledAt` set to the selected time and `isPublished` is `false`.

---

## Test Case 2: History API Filtering (Upcoming vs Published)

### Steps
1. Navigate to the **History** page.
2. Observe the two tabs: **Scheduled** and **Published**.
3. Create another post for immediate launch.
4. Wait for the immediate post to be processed (or manually set `isPublished` to `true` in DB).

### Expected Results
- **Scheduled Tab:** Shows only posts where `isPublished` is `false`.
- **Published Tab:** Shows only posts where `isPublished` is `true`.
- **Ordering:**
    - Scheduled posts are ordered by `scheduledAt` **ASCENDING** (soonest first).
    - Published posts are ordered by `createdAt` **DESCENDING** (newest first).

---

## Test Case 3: Robustness & Validation (API Layer)

### Steps
1. Attempt to call the `/api/history` endpoint directly with invalid parameters (if applicable).
2. Attempt to call `/api/upload/assemble` with a malformed `scheduledAt` string (e.g., "invalid-date").

### Expected Results
- The API should return a `400 Bad Request` error due to Zod validation failure.
- No database records should be created for invalid requests.
- Sentry logs should capture the validation warnings/errors if configured.

---

## Edge Cases
- **Past Schedule:** Attempting to schedule a post in the past should either be blocked by the UI or handled gracefully by the API (e.g., treated as immediate or rejected).
- **Timezone:** Verify that the scheduled time is correctly stored and displayed in the user's local timezone vs UTC.
