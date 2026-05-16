# Manual Test: Global Search Field

## Prerequisites
1. Authenticated user with existing post history and media assets.
2. At least 5-10 posts in the Activity Hub with varying titles and descriptions.
3. At least 5-10 videos in the Media Gallery with varying filenames.

## Test Scenarios

### 1. Activity Hub (History) Search
1. Navigate to the **Activity Hub** (/history).
2. Locate the search bar at the top of the list.
3. **Keyword Search:** Type a word that appears in one of your post titles.
    - **Expected:** The list should update (debounced) to show only matching posts.
4. **Description Search:** Type a word that appears only in a post description.
    - **Expected:** The list should show posts where the description matches.
5. **No Results:** Type a random string that doesn't match anything.
    - **Expected:** A "No matching activity" empty state should appear with the search term displayed.
6. **Clear Search:** Clear the search bar.
    - **Expected:** The full history list should be restored.
7. **Pagination + Search:** Search for a term that has more than 20 results (if possible) and click "Load More".
    - **Expected:** The additional results should also be filtered by the search term.

### 2. Media Gallery Search
1. Navigate to the **Media Gallery** (/media).
2. Locate the search bar at the top of the gallery.
3. **Filename Search:** Type part of a filename.
    - **Expected:** The gallery should filter in real-time to show only matching videos.
4. **No Results:** Type a random string.
    - **Expected:** "No matching videos found." message should appear.
5. **Clear Search:** Clear the search bar.
    - **Expected:** All assets should be visible again.

### 3. Consistency Check
1. Verify that the search bar looks and behaves identically in both views.
2. Verify that it follows the project's glassmorphism aesthetic.
3. Verify that the "Search" icon is correctly aligned and styled.
