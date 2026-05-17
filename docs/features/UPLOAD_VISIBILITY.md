# Enhanced Upload Visibility (Activity Hub Integration)

## Overview
Enhanced Upload Visibility provides real-time, context-specific feedback during the video upload and distribution process. Instead of a global floating element or in-form progress bars, the system adopts a "Dashboard-to-Activity" flow: progress is integrated directly into individual post cards within the **Activity Hub**, and the Dashboard redirects immediately upon submission to maintain a fast, distraction-free workflow.

## Architecture

The system uses a decentralized observation and signaling pattern via `localStorage`. This allows for cross-tab synchronization and global abort signals. It also leverages server-side actions to handle cancellations of optimistic states that haven't yet reached the database.

### Data Synchronization Flow
```mermaid
sequenceDiagram
    participant D as Dashboard
    participant U as Upload Utils (Lib)
    participant SA as Server Actions (Prisma)
    participant LS as localStorage (SS_STAGING_STATUS)
    participant H as useUploadStatus (Hook)
    participant AC as Activity Hub (Card/Ghost)

    D->>U: Start Upload
    D->>AC: Immediate Redirect (Inject Ghost Card)
    U->>LS: Write progress (historyId, percent, status, active: true)
    loop Every 500ms
        H->>LS: Read state
        H->>AC: Match historyId
        AC->>AC: Render preparation dot/bar
    end
    Note over AC: User triggers cancellation
    alt STOP ALL
        AC->>LS: Signal Abort (active: false)
        LS->>U: Global Abort Signal
        U->>U: Terminate Upload
    else Individual Platform
        AC->>SA: cancelPlatformByPostAction(historyId, platform)
        SA->>SA: Mark platform status as 'cancelled' in DB
        AC->>AC: Remove platform from local display
    end
```

## Key Features

### 1. Immediate Dashboard Redirect & Optimistic Ghost Card
To optimize "human-centric" design, the Dashboard no longer holds the user hostage during the staging phase. 
- **Redirect**: Once "Post Video" or "Confirm AI Strategy" is clicked, the user is immediately redirected to the Activity Hub.
- **Ghost Card**: Since the database record might take a few hundred milliseconds to propagate, an **Optimistic Ghost Card** is injected into the Activity Hub's local state via `localStorage` (SS_PENDING_POST). 
- **Persistence & Reconciliation**: The Ghost Card is designed to persist even across multiple polling cycles. It only disappears once a real database record with a matching `historyId` or `resumeHistoryId` is confirmed in the fetched list.
- **Fuzzy Matching Fallback**: If IDs mismatch (e.g., due to local generation), the system uses fuzzy matching: comparing the **Title** and **Creation Timestamp** (within a 60-second window) to identify the matching record and transition the Ghost Card into a standard History Card.
- **Visual Continuity**: This ensures the user sees their post *instantly* upon redirection, avoiding a "Missing Data" or empty state. The Ghost Card transitions into a standard history card once the real data arrives.

### 2. Multi-Level Cancellation (Global & Granular)
The system provides total control over the upload process even after redirection.
- **STOP ALL Button**: Appears on the Ghost Card and the active History Card. Clicking this sends a global abort signal via `localStorage` (SS_STAGING_STATUS), terminating all local staging and all scheduled platform distributions for that specific post. It also invokes `cancelAllUploadsAction` on the server.
- **Optimistic State Management**: To ensure maximum responsiveness, the UI uses a local `cancelledIds` state. Clicking "Stop" or "Stop All" immediately marks the platforms as **"Stopped"** in the UI, providing instant visual feedback while the background server action and abort signal processing complete.
- **Individual Platform Cancellation**: Each platform pill in an active card has a stop icon. 
- **Optimistic Individual Cancellation**: If a user cancels a platform on a Ghost Card, the system uses `cancelPlatformByPostAction`. This identifies the platform by name and history ID, ensuring the cancellation is recorded even if the client hasn't received the full record ID yet.

### 3. UI Layering & Responsiveness
A critical fix was implemented to ensure the "Initializing" progress bar does not block user interactions.
- **Z-Index Management**: The `globalPrepBar` and `globalPrepText` are assigned a strictly controlled `z-index` to ensure that the header buttons (STOP ALL, Manual Resume) and platform pills remain on the top-most layer and are always clickable, even while animations are active.
- **Immediate Haptic Feedback**: All buttons use the `cancelledIds` state to provide "light speed" feedback, making the application feel alive and responsive.

### 4. Manual Resume & Button Exclusivity
The system intelligently toggles between control states based on the post's health.
- **Exclusivity**: Active uploads (either in staging or distribution) show the **STOP ALL** button. Stale uploads (where platforms are 'pending' but no local activity is detected for > 60 seconds) hide the stop button and instead display the **Manual Resume** button.
- **In-Place Resume**: Clicking Manual Resume allows the user to re-select the source file and restart the upload process for the remaining pending platforms without creating a duplicate history entry.
- **Visual Feedback**: During a resume, the button transitions to a "Processing" state with a pulsing icon to indicate the re-initialization is underway.

### 5. Cross-Tab Abort Signaling
If a user has multiple tabs open:
- Clicking **STOP ALL** in the Activity Hub tab writes an `active: false` signal to `localStorage` for that specific `historyId`.
- The background upload process (which might be running in the original Dashboard tab or a worker) polls this signal and terminates immediately.
- The Dashboard tab observes the global abort and resets its local distribution engine.

### 6. Integrated Activity Hub Indicators
- **Processing Dot**: An animated pulsing dot appears next to the post title in the Activity Hub while any part of the process (staging or distribution) is active.
- **Universal Status Messages**: Status messages are generalized and technical (e.g., "Initializing distribution", "Preparing assets"). Chat emojis have been removed for a professional aesthetic.

## Reliability & Fixes

### Stale ID Resolution
A critical bug was fixed where background account mapping (Platform Sync) was using stale or incorrect User IDs during the staging phase. The mapping logic now strictly resolves the current authenticated user context before initiating platform-specific tokens, ensuring 100% reliability for multi-platform distribution.

## Key Components

### 1. `src/lib/upload/upload-utils.ts` (Broadcast & Signal Listener)
- **Check Global Abort**: Every chunk upload and every platform distribution step checks `checkGlobalAbort(historyId)`.
- **Staging Phase**: Broadcasts percentage-based progress to `SS_STAGING_STATUS`.
- **Distribution Phase**: Broadcasts status-based progress (e.g., "Uploading to youtube...").

### 2. `src/hooks/useUploadStatus.ts` (State Synchronizer)
- Polls `localStorage` every 500ms.
- Validates data using **Zod**.
- Returns `{ historyId, status, percent, active }`.

### 3. `src/components/dashboard/DashboardClient.tsx`
- Observes `useUploadStatus`.
- If a global `active: false` signal is detected for an ongoing local upload, it invokes `handleAbortAll()` to clean up local resources.

## UI & Aesthetic Standards
- **Zero Floating HUDs**: Floating overlays have been removed to reduce visual clutter.
- **Material UI Icons**: Exclusively uses `StopIcon`, `RocketLaunchIcon`, and `AutoAwesomeIcon`.
- **No Emojis**: Status messages use technical text (e.g., "Synchronizing cockpit state") rather than emojis.
- **Units**: File sizes and progress are in **Metric** (MB).

## Performance Considerations
- **Polling vs Events**: `localStorage` polling at 500ms provides reliable cross-tab communication without the complexity of BroadcastChannel or Service Workers, fitting the current scale of the application.

## Error Handling
- **Graceful Termination**: Aborting a request doesn't just "stop" the UI; it ensures the underlying `fetch` requests are aborted and local state is reset.
- **Persistence**: If a user refreshes the page, the `localStorage` signal ensures the Activity Hub continues to show the correct "Active" state for ongoing background tasks.
