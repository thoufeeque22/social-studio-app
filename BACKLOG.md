# Social Studio Backlog

This document tracks future features and improvements for the Social Studio App.

## High Priority 🚀
1. [x] **Initial Project Structure**: Next.js + Tailwind (v4) setup.
2. [x] **YouTube Direct Upload**: OAuth2 integration for Shorts/Videos.
3. [x] **Instagram Reels Native Integration**: Direct API connection for cross-posting Reels & Graph API Orchestration.
4. [x] **Remove FFmpeg Muxing engine**: Completely stripped the Muxing/Audio-Burn feature to return to a stable, native-audio-only upload system.
5. [x] **Main App Authentication & Authorization (A&A)**: Secure the application with robust user accounts and roles.
6. [ ] **TikTok Production Rollout**: Submit Developer App for audit to remove Sandbox mode restrictions and fully unlock public posting capability.
7. [ ] **Database-Backed Configs**: Move enabled platform states and configuration from `localStorage` to the database.
8. [ ] **Per-Post Platform Checklist**: Add a checklist UI during the creation/upload flow to manually select/deselect which connected platforms should receive the current post.
9. [x] **Facebook Native Integration**: Direct API connection for cross-posting to Facebook Pages/Profiles.
10. [ ] **Account Flexibility**: Should be able to connect to multiple accounts in single platform.
11. [ ] **Settings: Disconnect Dashboard**: Add a "Disconnect" button to all platform connections.
12. [ ] **Settings: Account Identity**: Display exactly which account (name/email) is currently connected for each platform.
13. [x] **Testing Infrastructure**: Configured Vitest and migrated legacy unit tests.
14. [ ] **Settings: Active Connections Only**: In the settings, display the option to connect/disconnect only for apps that are toggled "Enabled" in distribution.
15. [ ] **Settings: Connection Cards**: Redesign connection rows into responsive small cards (grid layout, 1+ per line).
16. [ ] **Long Format Video Support**: Support for uploading and managing long-form content.

## Medium Priority 📈
17. [ ] **Dashboard Stats Integration**: Replace the hardcoded MVP stats grid with real performance metrics from YouTube/Instagram.
18. [ ] **Scheduling & Calendar Queue**: Plan out posts across platforms and replace the "Upcoming Posts" wireframe on the main view with actual data.
19. [ ] **AI Gen Content Review**: Add review step and disclaimer to verify AI generated content before posting.
20. [ ] **Music Trending Engine**: Suggest trending audio for native app selection or AI beat-sync suggestions.
21. [ ] **Media Gallery**: A centralized view to manage local and uploaded video files.
22. [ ] **AI Chatbot**: Intelligent assistant to help upload, schedule, and manage content.

## Low Priority 🛠️
23. [x] **Header Navigation**: "Create Post" active scrolling.
24. [ ] **Video Preview**: Integrated video player to review content before posting.
25. [ ] **Support Email**: Set up and display support contact information.
26. [ ] **Dark/Light Mode Toggle**: Professional theme switching.

## Legal & Compliance ⚖️
27. [ ] **Terms and Conditions**: Draft and implement T&Cs for users.
28. [ ] **Policies**: Draft and implement Privacy Policy and other required documentation.
29. [ ] **Documentation**: Create user enablement and developer documentation.
30. [ ] **Legal Review**: General review to ensure the app abides by relevant laws and regulations.

## Internal Admin Tasks 🔒
31. [ ] **AI Studio Billing Check**: Routine check of prepaid billing / credits in AI studio to avoid unexpected stoppage.
