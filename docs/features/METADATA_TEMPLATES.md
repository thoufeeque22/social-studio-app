# Metadata Templates

Metadata Templates allow users to save and reuse common metadata snippets (e.g., standard descriptions, "Link in Bio" text, or credits) across multiple posts to streamline their workflow.

## Overview

Users often have repetitive text they include in every post, such as social links, attribution, or call-to-actions. Instead of manual copy-pasting, they can now save these as "Snippets" and insert them with a single click.

## Core Components

### 1. Snippet Selection (Upload Dashboard)
Located next to the description fields in the main upload form.
- **Insert:** Choose an existing snippet to append it to the current description.
- **Save:** Quickly save the current description as a new snippet for future use.

### 2. Snippet Management (Settings)
A dedicated section in the Settings page (`/settings`) for organizing saved assets.
- **List View:** See all saved snippets, their names, and content previews.
- **Delete:** Remove outdated or redundant snippets.

## Technical Implementation

### Data Model
Managed via Prisma in `prisma/schema.prisma`:
- **Model:** `MetadataTemplate`
- **Fields:** `id`, `userId` (owner), `name`, `content` (text), `createdAt`, `updatedAt`.
- **Relationship:** Belongs to a `User` (Cascade delete).

### Server Actions
Implemented in `src/app/actions/metadata.ts`:
- `getMetadataTemplates()`: Fetches user-specific snippets.
- `createMetadataTemplate(data)`: Persists a new snippet.
- `deleteMetadataTemplate(id)`: Removes a snippet (with ownership check).

### State Management
Enhanced `useUploadForm` hook in `src/hooks/dashboard/useUploadForm.ts`:
- `appendDescription(val, platform?)`: Helper to intelligently append text with proper newline separation.

## User Flow

```mermaid
graph TD
    A[Start Post] --> B{Existing Snippet?}
    B -- Yes --> C[Click Snippets Dropdown]
    C --> D[Select Snippet]
    D --> E[Snippet Appended to Description]
    B -- No --> F[Type Description]
    F --> G[Click Snippets -> Save Current]
    G --> H[Snippet Saved for Future]
    E --> I[Distribute Post]
    H --> I
```
