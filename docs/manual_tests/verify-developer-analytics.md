# User Acceptance Testing: Developer Analytics

## Prerequisites
- User must be authenticated with `ADMIN` role.
- Database must contain sample `SystemMetric` records.

## Test Cases

### 1. Access Control
- **Goal:** Verify that only admins can access analytics.
- **Steps:**
  1. Log in as a standard user.
  2. Navigate to `/admin/analytics`.
- **Expected Result:** Redirection to home or 403 Forbidden page.

### 2. Dashboard Rendering
- **Goal:** Verify successful loading of the dashboard.
- **Steps:**
  1. Log in as an `ADMIN` user.
  2. Navigate to `/admin/analytics`.
- **Expected Result:**
  - Metrics chart renders successfully.
  - No hydration errors.
  - All labels and data are legible.

### 3. Metric Aggregation
- **Goal:** Verify accurate data display.
- **Steps:**
  1. Log in as an `ADMIN` user.
  2. Observe counts for recent events (e.g., successful distributions).
- **Expected Result:** Numbers match database state and reflect real-time telemetry.
