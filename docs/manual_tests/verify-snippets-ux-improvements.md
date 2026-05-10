# UAT Script: Snippets UX Improvements (#374)

## Overview
This script specifically verifies the UX improvements for the Snippets menu: closing automatically on save/selection and closing when clicking outside.

## Prerequisites
- User must be logged in.
- Navigate to the Dashboard (`/`).

## Scenario 1: Close on Click Outside
1. **Click** the "Snippets" button (bookmark icon).
2. **Verify** the menu appears.
3. **Click** on a blank area of the dashboard (away from the menu).
4. **Expected Result:** The snippets menu closes immediately.

## Scenario 2: Close on Save
1. **Type** some text in the Description field.
2. **Click** "Snippets" -> "Save Current as Snippet".
3. **Enter** a name and click **Save**.
4. **Expected Result:** The menu closes automatically after the save operation completes.

## Scenario 3: Close on Selection
1. **Click** "Snippets" button.
2. **Select** any existing snippet from the list.
3. **Expected Result:** The menu closes automatically, and the text is appended to the description.

## Scenario 4: Close via X Button
1. **Click** "Snippets" button.
2. **Click** the "X" button in the top right of the menu.
3. **Expected Result:** The menu closes immediately.
