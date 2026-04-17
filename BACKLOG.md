# Social Studio Backlog

This document tracks future features and improvements for the Social Studio App.

## High Priority 🚀
- [x] **Initial Project Structure**: Next.js + Tailwind (v4) setup.
- [x] **YouTube Direct Upload**: OAuth2 integration for Shorts/Videos.
- [x] **Instagram Reels Native Integration**: Direct API connection for cross-posting Reels & Graph API Orchestration.
- [x] **Remove FFmpeg Muxing engine**: Completely stripped the Muxing/Audio-Burn feature to return to a stable, native-audio-only upload system.
- [x] **Main App Authentication & Authorization (A&A)**: Secure the application with robust user accounts and roles.
- [ ] **TikTok Production Rollout**: Submit Developer App for audit to remove Sandbox mode restrictions and fully unlock public posting capability.
- [x] **Database-Backed Configs**: Move enabled platform states and configuration from `localStorage` to the database.
- [x] **Per-Post Platform Checklist**: Add a checklist UI during the creation/upload flow to manually select/deselect which connected platforms should receive the current post.
- [x] **Facebook Native Integration**: Direct API connection for cross-posting to Facebook Pages/Profiles.
- [x] **Account Flexibility**: Should be able to connect to multiple accounts in single platform.
- [ ] **Settings: Disconnect Dashboard**: Add a "Disconnect" button to all platform connections.
- [x] **Settings: Account Identity**: Display exactly which account (name/email) is currently connected for each platform.
- [x] **Testing Infrastructure**: Configured Vitest and implemented comprehensive unit tests for AI-writer, Instagram integration, and the Authentication/Login flow.
- [ ] **Settings: Active Connections Only**: In the settings, display the option to connect/disconnect only for apps that are toggled "Enabled" in distribution.
- [x] **Settings: Connection Cards**: Redesign connection rows into responsive small cards (grid layout, 1+ per line).
- [ ] **Long Format Video Support**: Support for uploading and managing long-form content.
- [ ] **Post Success Visuals**: Add visual check marks to platform pills in the distribution checklist after successful individual uploads.

## Medium Priority 📈
- [ ] **Dashboard Stats Integration**: Replace the hardcoded MVP stats grid with real performance metrics from YouTube/Instagram.
- [ ] **Scheduling & Calendar Queue**: Plan out posts across platforms and replace the "Upcoming Posts" wireframe on the main view with actual data.
- [ ] **AI Gen Content Review**: Add review step and disclaimer to verify AI generated content before posting.
- [ ] **Music Trending Engine**: Suggest trending audio for native app selection or AI beat-sync suggestions.
- [ ] **Media Gallery**: A centralized view to manage local and uploaded video files.
- [ ] **AI Chatbot**: Intelligent assistant to help upload, schedule, and manage content.
- [ ] **Stop/Abort Posting**: Add a button to stop or abort the remaining platform uploads in a sequential flow.
- [ ] **Parallel Multi-Platform Posting**: Optimize the upload flow by triggering platform fetches in parallel (Promise.all) instead of sequentially.

## Low Priority 🛠️
- [x] **Header Navigation**: "Create Post" active scrolling.
- [ ] **Video Preview**: Integrated video player to review content before posting.
- [ ] **Support Email**: Set up and display support contact information.
- [ ] **Dark/Light Mode Toggle**: Professional theme switching.
- [ ] **Terms and Conditions**: Draft and implement T&Cs for users.
- [ ] **Policies**: Draft and implement Privacy Policy and other required documentation.
- [ ] **Documentation**: Create user enablement and developer documentation.
- [ ] **Legal Review**: General review to ensure the app abides by relevant laws and regulations.
- [ ] **AI Studio Billing Check**: Routine check of prepaid billing / credits in AI studio to avoid unexpected stoppage.
