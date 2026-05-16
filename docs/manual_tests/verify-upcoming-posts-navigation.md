# Manual Test: Verify Upcoming Posts Navigation

## Overview
This test verifies that the navigational links in the "Upcoming Posts" sidebar on the Dashboard correctly redirect the user to the Schedule view, auto-scroll to the correct post, and apply a highlight animation.

## Prerequisites
1. User is logged into the application.
2. User has at least 2-3 scheduled posts in their history (unpublished).
3. If testing in development, run the seed script:
   ```bash
   npx tsx scripts/seed-e2e-schedule.ts
   ```

## Test Steps

### 1. "View All" Navigation
1. Navigate to the **Dashboard** (`/`).
2. Locate the **Upcoming Posts** section in the sidebar.
3. Verify that a "Calendar" icon button (Tooltip: "View full schedule") is visible in the section header.
4. Click the **View All** button.
5. **Expected Result:** The application redirects to the **Schedule** page (`/schedule`).

### 2. Specific Post Deep-Linking
1. Navigate back to the **Dashboard** (`/`).
2. Click on a specific post item in the **Upcoming Posts** sidebar list.
3. **Expected Result:**
   - The application redirects to the **Schedule** page with an `id` parameter in the URL (e.g., `/schedule?id=post-123`).
   - The page automatically scrolls to the selected post card.
   - The selected post card displays a **pulse highlight animation** (3 cycles) and a persistent border to indicate it was the targeted item.

### 3. Visual Feedback (Hover States)
1. On the **Dashboard**, hover over an item in the **Upcoming Posts** sidebar.
2. **Expected Result:**
   - The background of the item slightly darkens.
   - The vertical primary color indicator on the left thickens.
   - An "Open In New" icon (Arrow pointing out) appears on the right side of the item.

### 4. Robustness (Invalid ID)
1. Manually enter a URL with a non-existent ID: `/schedule?id=invalid-id-999`.
2. **Expected Result:**
   - The Schedule page loads normally.
   - No error toast or crash occurs.
   - No post card is highlighted.

### 5. Mobile Responsiveness
1. Open the application on a mobile device or use browser developer tools to simulate a mobile viewport (e.g., iPhone 12).
2. Navigate to the **Dashboard**.
3. Verify the **Upcoming Posts** sidebar (likely shifted to the bottom or within a scrollable area) is accessible.
4. Click a post item.
5. **Expected Result:** Navigation and auto-scroll work correctly on mobile.
