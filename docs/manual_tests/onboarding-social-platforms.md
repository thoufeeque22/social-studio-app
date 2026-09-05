# Manual Test: Social Platform Onboarding

## Prerequisites
- A test user account with `hasCompletedOnboarding=false`.

## Test Steps
1. Log in to the application.
2. Upon landing on the dashboard (`/app`), verify that the onboarding modal titled "Help Us Prioritize!" appears.
3. Verify the modal displays a list of social media platforms (e.g., TikTok, Instagram, X/Twitter, LinkedIn, Facebook, Pinterest, Reddit).
4. Select two platforms (e.g., TikTok and LinkedIn) and click the "Help Us Prioritize!" submit button.
5. Verify the modal closes successfully and database is updated.
6. Refresh the page and verify the modal does NOT reappear.
7. Reset the test user's `hasCompletedOnboarding` state to `false`.
8. Log in again, verify the modal appears, and click the "Skip for now" button.
9. Verify the modal closes successfully.
10. Refresh the page and verify the modal does NOT reappear.
