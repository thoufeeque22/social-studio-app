# Manual Test: Verify Calendar Content Planner

## Overview
This test verifies the unified Calendar Content Planner on the Schedule page, covering the 3-way view toggle, unified header navigation, and visual consistency.

## Prerequisites
1. User is logged into the application.
2. User has scheduled posts spread across different days/weeks.
3. If testing in development, run the seed script:
   ```bash
   npx tsx scripts/seed-e2e-schedule.ts
   ```

## Test Steps

### 1. View Mode Toggling
1. Navigate to the **Schedule** page (`/schedule`).
2. Verify the 3-way toggle control in the page-level header: **Timeline** | **Month** | **Week**.
3. Click each option sequentially.
4. **Expected Result:** The main content area updates immediately to the selected view mode (Timeline list, Monthly grid, or Weekly rows).

### 2. Header Navigation
1. Use the navigation controls in the main page header:
   - Click **Previous** (`<`) and **Next** (`>`) buttons.
   - Click the **Today** button.
2. **Expected Result:** The content area updates to the correct period (Month/Week/Timeline). The **Today** button resets the view to the current period and highlights the current day.

### 3. Interactivity
1. In any view, click on a scheduled post.
2. **Expected Result:** The **Edit Scheduled Post** modal opens correctly.
3. Update post details and save.
4. **Expected Result:** The modal closes and the calendar updates the post information in real-time.

### 4. Visual Consistency
1. Verify deep glassmorphism effects and platform-specific color coding for post formats.
2. Hover over a scheduled post item.
3. **Expected Result:** A tooltip appears showing the full title; UI responsiveness remains fluid.

### 5. Mobile Responsiveness
1. Toggle the 3-way view control on mobile viewports.
2. **Expected Result:** Header controls and view layouts scale appropriately to fit smaller screen widths without overlapping elements.
