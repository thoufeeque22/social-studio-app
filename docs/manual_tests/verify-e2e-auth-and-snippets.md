# UAT Script: E2E Authentication and Metadata Snippets

## Overview
This script verifies two core pieces of functionality:
1.  **E2E Authentication:** Ensures that a user can log in, and that the session is correctly reused across tests, providing a seamless testing experience.
2.  **Metadata Snippets:** Validates the complete lifecycle of creating, using, and managing reusable metadata templates (snippets).

## Prerequisites
- The application must be running in a local development environment.
- The E2E test user (`tester@socialstudio.ai`) must exist in the database.
- A clean database state is recommended for the template management tests.

## Scenario 1: E2E Authentication and Session Reuse
1.  **Objective:** Verify that the Playwright global setup correctly authenticates a user and saves the session.
2.  **Execution:** This scenario is automatically executed by Playwright before any tests are run.
3.  **Verification Steps:**
    1.  Run the `auth-reuse.spec.ts` test (`npx playwright test src/__tests__/e2e/auth-reuse.spec.ts`).
    2.  **Expected Result:** The test should pass. The test navigates directly to the dashboard and verifies that the user is already logged in, by checking for the presence of user-specific elements (e.g., account buttons like "Tester Alpha").

## Scenario 2: Snippet Creation and Usage on Dashboard
1.  **Objective:** Verify that a user can create a new snippet from the dashboard and apply it to a description.
2.  **Manual Steps:**
    1.  Navigate to the **Dashboard** (`/`).
    2.  In the "Description" text area, type a new snippet, e.g., "My awesome snippet!".
    3.  Click the **Snippets** button (bookmark icon) next to the "Description" label.
    4.  Click **Save Current as Snippet**.
    5.  In the name input, type "My First Snippet" and click **Save**.
    6.  **Expected Result:** The snippet menu closes, and the new snippet is saved.
    7.  Clear the "Description" text area.
    8.  Click the **Snippets** button again.
    9.  Select "My First Snippet" from the list.
    10. **Expected Result:** The text "My awesome snippet!" is appended to the description field.

## Scenario 3: Snippet Management in Settings
1.  **Objective:** Verify that a user can edit and delete snippets from the settings page.
2.  **Manual Steps:**
    1.  Navigate to the **Settings** page (`/settings`).
    2.  Locate the "My First Snippet" created in the previous scenario.
    3.  Click the **Edit** button (pencil icon).
    4.  Change the name to "My First Snippet - Edited" and the content to "My edited content.".
    5.  Click **Save**.
    6.  **Expected Result:** The snippet is updated in the list with the new name and content.
    7.  Click the **Delete** button (trash can icon) for the edited snippet.
    8.  Confirm the deletion when prompted.
    9.  **Expected Result:** The snippet is removed from the list, and the "No saved snippets yet" message appears.

## Scenario 4: Platform-Specific Snippets
1.  **Objective:** Verify that snippets can be used independently for platform-specific descriptions.
2.  **Manual Steps:**
    1.  Navigate to the **Dashboard** (`/`).
    2.  Select at least two accounts to enable the platform-specific toggle.
    3.  Click the **Separate titles/descriptions per platform** toggle.
    4.  In the description field for one of the platforms (e.g., YouTube), click the **Snippets** button.
    5.  Select a snippet.
    6.  **Expected Result:** The snippet content is appended only to the description field of that specific platform, and not to the others.
