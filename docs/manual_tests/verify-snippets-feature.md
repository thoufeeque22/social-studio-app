# UAT: Metadata Templates (Snippets)

This test verifies the ability to save, reuse, and manage reusable description snippets (e.g., bio links, credits).

## Prerequisites
- User: `tester@socialstudio.ai`
- Environment: Local development server (`npm run dev`)
- Platform Access: `local1` and `local2` enabled.

## Scenarios

### 1. Creating a New Snippet
1.  **Navigate** to the Dashboard (`/`).
2.  **Type** "This is my standard link in bio: https://socialstudio.ai" into the Description field.
3.  **Click** the **Snippets** button (bookmark icon) next to the Description label.
4.  **Click** **Save Current as Snippet**.
5.  **Enter** "Bio Link" as the snippet name.
6.  **Click** **Save**.
7.  **Expected Result**: The snippet menu closes, and the new snippet "Bio Link" is now available in the list.

### 2. Applying a Saved Snippet
1.  **Clear** the Description field.
2.  **Click** the **Snippets** button.
3.  **Select** "Bio Link" from the list.
4.  **Expected Result**: The description field is automatically populated with the saved content.

### 3. Managing Snippets in Settings
1.  **Navigate** to `/settings`.
2.  **Locate** the **Reusable Snippets** section.
3.  **Verify** "Bio Link" is listed.
4.  **Click** the Edit button for "Bio Link".
5.  **Change** the content and save.
6.  **Verify** the change persists.
7.  **Click** the Delete (Trash) icon for "Bio Link".
8.  **Expected Result**: The snippet is removed from the list.

## Error Handling & Diagnostics
- If you see "Metadata Template feature is currently unavailable", check the server logs for "Prisma client mismatch" errors.
- Ensure the database is up to date: `npx prisma db push`.
