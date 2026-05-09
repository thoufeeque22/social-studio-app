# UAT Script: Metadata Templates (#374)

## Overview
This script verifies the ability to save, reuse, and manage metadata snippets (standard descriptions, bio links, credits) across posts.

## Prerequisites
- User must be logged in.
- At least one video file ready for a dummy upload.

## Scenario 1: Saving and Using a Global Snippet (Happy Path)
1. **Navigate** to the Upload Dashboard (`/`).
2. **Select** a video file (or browse gallery).
3. **Type** a standard description in the "Description" field (e.g., "Follow me on IG: @socialstudio").
4. **Click** the "Snippets" button (bookmark icon) next to the description label.
5. **Click** "Save Current as Snippet".
6. **Enter** a name: "My IG Link".
7. **Click** "Save".
8. **Clear** the description field manually.
9. **Click** "Snippets" button again.
10. **Verify** "My IG Link" appears in the list.
11. **Select** "My IG Link".
12. **Expected Result:** The description field is automatically populated with "Follow me on IG: @socialstudio".

## Scenario 2: Platform-Specific Snippets
1. **Enable** "Separate titles/descriptions per platform" toggle.
2. **Select** at least two platforms (e.g., YouTube and TikTok).
3. **Find** the YouTube description field.
4. **Click** the "Snippets" button for YouTube.
5. **Select** an existing snippet.
6. **Verify** only the YouTube description is updated.
7. **Repeat** for TikTok.
8. **Expected Result:** Snippets can be independently applied to different platform descriptions.

## Scenario 3: Managing Snippets in Settings
1. **Navigate** to the Settings page (`/settings`).
2. **Locate** the "Reusable Snippets" section.
3. **Verify** all saved snippets are displayed with their names and content previews.
4. **Click** the trash icon on a snippet.
5. **Confirm** the deletion in the browser dialog.
6. **Verify** the snippet is removed from the list.
7. **Return** to the Upload Dashboard.
8. **Click** "Snippets".
9. **Expected Result:** The deleted snippet no longer appears in the selection list.

## Scenario 4: Edge Cases & UI Polish
1. **Attempt** to save a snippet when the description field is empty.
   - **Expected Result:** "Save Current as Snippet" button should be disabled.
2. **Open** the snippets dropdown and click the "X" or outside the menu.
   - **Expected Result:** Menu closes gracefully.
3. **Save** a very long snippet name.
   - **Expected Result:** UI should handle text wrapping or truncation without breaking layout.
