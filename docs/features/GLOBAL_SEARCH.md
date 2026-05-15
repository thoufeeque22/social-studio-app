# Global Search

## Overview

Global Search provides a unified and consistent filtering mechanism across the core media and activity views in Social Studio. It allows users to quickly locate past posts, scheduled content, and uploaded media assets using keywords.

## Implementation Details

### 1. Unified Search Component (`SearchField.tsx`)

A reusable UI component was created to ensure visual and behavioral consistency.

- **Styling:** Follows the project's glassmorphism aesthetic with a semi-transparent background, subtle blur, and integrated Material UI Search icon.
- **Interactivity:** Includes a clear button (visible only when text is present) and maintains focus state transitions.
- **Accessibility:** Uses proper ARIA labels and roles for screen reader compatibility.

### 2. Server-Side Filtering

Unlike simple client-side filtering, Global Search performs queries on the server to ensure scalability as the user's history and gallery grow.

- **Prisma Integration:** API routes use the `contains` filter with `insensitive` mode to perform case-insensitive partial matches on relevant fields.
  - **History API:** Filters `title` and `description`.
  - **Media API:** Filters `fileName`.
- **Debouncing:** The client-side implementation uses a 500ms debounce to prevent excessive API calls while the user is typing.

### 3. Integration Points

#### Activity Hub (`/history`)
- Integrated into the main list header.
- Works seamlessly with pagination ("Load More") and background polling.
- Displays a "No matching activity" empty state when no results are found.

#### Media Gallery (`/media`)
- Replaces the previous local filtering logic.
- Standardizes the search UI with the rest of the application.
- Displays a "No matching videos found" message for empty results.

## Performance Considerations

- **Database Indexes:** To maintain performance, the database schema should include indexes on the `title`, `description` (PostHistory), and `fileName` (GalleryAsset) columns if the datasets become significantly large.
- **API Efficiency:** Only the filtered subset of data is returned to the client, reducing payload size and rendering overhead.
