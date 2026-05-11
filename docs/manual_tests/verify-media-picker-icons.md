# UAT: Verify MediaPicker Icons Migration

## Prerequisites
- User authenticated with access to the dashboard.
- At least one staged video file exists in the account library.

## Steps
1. Navigate to the dashboard.
2. Open the "Choose from Staged Media" modal.
3. Verify the following UI elements:
    - **Header:** "Choose from Staged Media" is preceded by a `MovieIcon`.
    - **Search bar:** Icon is `SearchIcon`.
    - **Asset list:** Each asset displays:
        - `StorageIcon` before the file size.
        - Expiration timer info:
            - If expiring soon: `WarningIcon` (red color).
            - Otherwise: `AccessTimeIcon`.
        - Action buttons:
            - Delete button (trash icon) is `DeleteIcon`.
            - Selection checkmark is `CheckIcon`.

## Expected Results
- All icons render correctly using Material UI library.
- No console errors related to icon components or missing name references.
- Visual alignment and spacing match the previous design (icons sized correctly).
