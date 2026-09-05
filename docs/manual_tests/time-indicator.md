# Manual Test Plan: Global Time Indicator

## Feature Description
The Global Time Indicator displays the user's current local time in the app header, based on their selected timezone in Settings.

## Prerequisites
- A valid user account logged into the application.
- Access to the Settings -> Preferences page.

## Test Cases

### TC01: Time Indicator Toggle in Settings
1. Navigate to Settings -> Preferences tab.
2. Locate the "Show time in header" toggle switch (below the Timezone Picker).
3. Verify that by default, the toggle is OFF.
4. Toggle it ON.
5. Verify the preference is saved successfully.
6. Refresh the page and ensure the toggle remains ON.

### TC02: Displaying Time Indicator in Header
1. Ensure "Show time in header" is enabled.
2. Observe the top-right actions menu in the application header (next to Theme Toggle / What's New badge).
3. Verify a clock is displayed showing the current time (e.g., "10:42 AM").
4. Verify the time ticks and updates every minute without needing a page refresh.

### TC03: Disabling Time Indicator
1. With the time indicator currently visible, navigate to Settings -> Preferences tab.
2. Toggle "Show time in header" OFF.
3. Verify the setting is saved.
4. Observe the header immediately.
5. Verify the time indicator is no longer displayed.
6. Refresh the page and ensure the indicator remains hidden.

### TC04: Real-time update on Timezone Change
1. Ensure "Show time in header" is enabled and the time is visible in the header.
2. In the Settings -> Preferences tab, change the Timezone using the Timezone Picker (e.g., change from UTC to Asia/Tokyo).
3. Observe the time indicator in the header.
4. Verify the displayed time updates instantly to reflect the newly selected timezone.

### TC05: Consistency across pages
1. Enable the "Show time in header" setting.
2. Navigate to different pages in the application (Dashboard, Profile, Billing, etc.).
3. Verify that the time indicator remains consistently visible and accurate on all pages with the header.
