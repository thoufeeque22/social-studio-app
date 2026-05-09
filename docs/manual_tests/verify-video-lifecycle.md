# UAT: Video Lifecycle & Storage Quotas

## Purpose
Verify the implementation of per-user storage quotas, automated file expiry (smart expiry), and background cleanup of orphaned files.

## Prerequisites
- A test user account.
- Access to the application database (to verify `expiresAt` fields and storage usage).
- Access to the `src/tmp` directory on the server/local environment.
- At least two video files for testing (one small, one medium).

---

## Test Case 1: Storage Quota Enforcement

### Prerequisites
- The current user's storage usage should be known (or zero).

### Steps
1. Navigate to the **Upload** page.
2. Select a video file for upload.
3. Fill in the required fields and click **Launch**.
4. **Observe:** The upload should succeed.
5. In the database, check the `GalleryAsset` table for the user and verify `fileSize` matches the uploaded file.
6. Repeatedly upload videos until the total size exceeds **2GB** (or manually mock the `fileSize` in the DB for one asset to be near 2GB).
7. Attempt one more upload.

### Expected Results
- When the 2GB limit is reached, the **Launch** button (or initialization phase) should return an error.
- **Error Message:** "Storage limit exceeded. You are using X MB of your 2048 MB quota. Please delete some old videos from your Gallery before uploading more."
- No new `PostHistory` or `GalleryAsset` records should be created after the limit is hit.

---

## Test Case 2: Smart Expiry (Database Logic)

### Steps
1. Navigate to the **Upload** page.
2. Select a video.
3. Choose **Schedule for later** and select a date/time (e.g., tomorrow at 10:00 AM).
4. Click **Launch**.
5. Once assembly is complete, check the `GalleryAsset` table in the database.

### Expected Results
- Find the new record.
- Verify `expiresAt` is exactly **48 hours after** the `scheduledAt` time.
- If no schedule was provided (Immediate publish), verify `expiresAt` is **7 days after** the current time.

---

## Test Case 3: Worker Expiry Shortening (Post-Publish)

### Steps
1. Upload a video and schedule it for a few minutes in the future.
2. Ensure the background worker is running.
3. Wait for the worker to successfully publish the video to at least one platform.
4. Check the `GalleryAsset` record for this file in the database.

### Expected Results
- After successful publication, the `expiresAt` value in `GalleryAsset` should have been updated.
- **Logic:** It should now be **24 hours after** the current time (shortened from the original 48h-post-schedule grace period).

---

## Test Case 4: Orphaned File Cleanup (Background Worker)

### Steps
1. Manually create a dummy file in the `src/tmp` directory (e.g., `touch src/tmp/orphaned_test.mp4`).
2. Manually modify the file's "Last Modified" date to be older than 24 hours (e.g., `touch -t 202001010101 src/tmp/orphaned_test.mp4`).
3. Ensure the file is **NOT** listed in either `GalleryAsset` (as `fileId`) or `PostHistory` (as `stagedFileId`).
4. Trigger the `purgeExpiredAssets()` worker function (or wait for the polling interval).

### Expected Results
- The file `src/tmp/orphaned_test.mp4` should be deleted from the file system.
- Check the application logs; it should show: `🧹 [WORKER] Purged orphaned file: orphaned_test.mp4`.

---

## Edge Cases to Watch For
- **Deleting Assets:** Verify that deleting a video from the Gallery UI correctly decrements the user's storage quota (enabling new uploads).
- **Incomplete Uploads:** Ensure that chunk directories in `src/tmp/chunks` are cleaned up even if the assembly fails or is abandoned (orphaned cleanup logic should handle this).
- **Multiple Platforms:** If one platform fails but others succeed, ensure the `expiresAt` logic still maintains a safe grace period for retries.
