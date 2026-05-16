# Manual Test: Verify Calendar Content Planner

## Overview
This test verifies the new Calendar view in the Schedule page, including the ability to toggle between Timeline and Calendar modes, and navigate through Monthly and Weekly views.

## Prerequisites
1. User is logged into the application.
2. User has several scheduled posts spread across different days and weeks.
3. If testing in development, run the seed script:
   ```bash
   npx tsx scripts/seed-e2e-schedule.ts
   ```

## Test Steps

### 1. View Mode Toggling
1. Navigate to the **Schedule** page (`/schedule`).
2. Verify that a toggle with **Timeline** and **Calendar** options is visible in the header.
3. Click on the **Calendar** button.
4. **Expected Result:** The view switches from the vertical timeline to a monthly calendar grid.

### 2. Monthly View Navigation
1. While in **Calendar** mode, verify the current month and year are displayed.
2. Click the **Next** (`>`) and **Previous** (`<`) arrows.
3. **Expected Result:** The calendar correctly navigates through months.
4. Click the **Today** button.
5. **Expected Result:** The calendar returns to the current month, and today's date is highlighted with a primary color circle.

### 3. Weekly View
1. Click the **Week** button in the calendar header.
2. **Expected Result:** The view switches to a weekly layout, showing days of the current week as rows.
3. Use the navigation arrows to move between weeks.
4. **Expected Result:** The "Week of [Date]" header updates correctly.

### 4. Interactivity
1. In either Monthly or Weekly view, locate a scheduled post.
2. Click on the post title.
3. **Expected Result:** The **Edit Scheduled Post** modal opens, allowing the user to modify the post.
4. Save a change or click Cancel.
5. **Expected Result:** The modal closes and the calendar reflects any changes (if saved).

### 5. Visual Consistency
1. Verify that "Short" format posts have a purple left border and "Long" format posts have a blue left border (matching the timeline's badges).
2. Hover over a post in the calendar.
3. **Expected Result:** A tooltip appears showing the full title of the post.

### 6. Mobile Responsiveness
1. Switch to a mobile viewport.
2. Verify the calendar grid is readable and scrollable if necessary.
3. Verify the Weekly view rows adapt to smaller screens.
