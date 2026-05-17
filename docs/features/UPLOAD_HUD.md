# TECHNICAL SPECS: Issue #425 - Enhanced Upload Visibility

## Overview
The goal is to provide clear, granular feedback during the video upload process (staging and distribution). The current implementation relies on `localStorage` to broadcast progress, which is underutilized in the UI.

## Synthesis
### Advocate Perspective (User Experience)
- Users need immediate assurance that an upload has started.
- A "stuck" feeling is minimized by showing actual progress percentages.
- Centralizing the UI logic ensures consistency across the application.
- UI elements (HUD/Progress Bar) must be non-intrusive but noticeable.

### Skeptic Perspective (Technical/Risk)
- Frequent `localStorage` reads/writes can lead to race conditions if not managed correctly.
- Component re-renders should be limited to prevent performance degradation on slower clients.
- The `UploadHUD` must handle the "missing percentage" state gracefully to prevent UI flickering or `NaN` errors.
- Aborted uploads must clear the `localStorage` state correctly to ensure subsequent uploads start from scratch.

## Proposed Implementation Plan

### 1. New Component: `UploadHUD` (`src/components/ui/UploadHUD.tsx`)
- **Responsibility**: Observes `SS_STAGING_STATUS` and renders progress.
- **Props**: None (reads globally from `localStorage` / custom event hook).
- **Features**:
  - `LinearProgress` (MUI) component for visual feedback.
  - Text label for the status string.
  - Graceful fallback: If `percent` is undefined, use an indeterminate progress bar.

### 2. Synchronization Hook: `useUploadStatus`
- Create `src/hooks/useUploadStatus.ts` to encapsulate `localStorage` polling.
- Use `useEffect` to listen for storage events or use a polling interval (e.g., 500ms) to sync the state.
- **Race Condition Prevention**: Ensure that only the active upload process can write to the `SS_STAGING_STATUS` key.

### 3. Integration
- **DashboardClient.tsx** and **src/app/history/page.tsx**: Replace duplicated HUD logic with `<UploadHUD />`.
- **UploadForm**: Integrate the same `useUploadStatus` hook. Disable the submit button while `uploading` is active, and show the progress bar directly below the button.

## Production Readiness
- **Accessibility**: Use `aria-valuenow`, `aria-valuemin`, `aria-valuemax` on the `LinearProgress` container.
- **Performance**: Polling interval set to 500ms is sufficient for visual feedback without thrashing the CPU.
- **Safety**: Input validation using Zod for the staging status JSON.

## Dependency Impact Radius
- `src/lib/upload/upload-utils.ts`: Remains the source of truth for the `SS_STAGING_STATUS` format.
- `src/components/ui/`: New component will be shared across `app/` routes.
- No changes required to backend API routes (`/api/upload/...`).

## Decision
Implementing this **now** is critical. Upload visibility is a core reliability requirement. A platform where users are unsure if their content is uploading or failing is not "production ready."

---
*Status: Discovery Complete. Ready for Dev implementation.*
