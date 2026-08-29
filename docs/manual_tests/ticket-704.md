# Manual Test Script for Ticket 704 (Comparison Matrix)

**Prerequisites:**
- Make sure your local server is running (`pnpm dev`).
- Make sure you are on the `feature/704-comparison-matrix` branch.
- Navigate to `http://localhost:3000/pricing`.

**Test Cases:**
1. **Anchor Link Navigation:** 
   - Click the "View all features" link on the bottom of any pricing card. 
   - Verify the page smoothly scrolls down past the "Power User" and "Agency" sections directly to the "Comparison Matrix" section.
2. **Section Visibility:** 
   - Verify there is a clear section title reading "Comparison Matrix" above the table.
   - Verify the table sits inside a standard container width and doesn't stretch awkwardly edge-to-edge.
3. **Desktop View:** 
   - Verify side-by-side plan comparison and sticky headers on scroll.
4. **Progressive Disclosure:** 
   - Expand/collapse MUI accordions to view features.
5. **Mobile View:** 
   - Resize browser to mobile width. Verify the dual dropdown selector and side-by-side comparison of 2 plans.
6. **Edge Case:** 
   - Verify text wrapping with excessively long feature descriptions.
