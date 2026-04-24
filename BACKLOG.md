# Social Studio Backlog

This document tracks future features and improvements for the Social Studio App.

## High Priority 🚀
- [x] **Initial Project Structure**: Next.js + Tailwind (v4) setup.
- [x] **Project Modularization**: Refactored monolithic pages into reusable components and shared hooks for better maintainability.
- [x] **YouTube Direct Upload**: OAuth2 integration for Shorts/Videos.
- [x] **Instagram Reels Native Integration**: Direct API connection for cross-posting Reels & Graph API Orchestration.
- [x] **Remove FFmpeg Muxing engine**: Completely stripped the Muxing/Audio-Burn feature to return to a stable, native-audio-only upload system.
- [x] **Main App Authentication & Authorization (A&A)**: Secure the application with robust user accounts and roles.
- [ ] **TikTok Production Rollout**: Submit Developer App for audit to remove Sandbox mode restrictions and fully unlock public posting capability.
- [x] **Scheduling Worker Relocation**: Moved the background worker initialization to a standalone script (`scripts/worker.ts`) managed by PM2, ensuring stability and avoiding Next.js runtime issues.
- [x] **Mobile Responsiveness Pass**: Audit and improve the mobile UI/UX across all pages, ensuring the dashboard, history, and settings are fully responsive.
- [x] **Bug**: YouTube distribution channel appears enabled by default in the post creation UI even when disabled in settings.
- [x] **Database-Backed Configs**: Move enabled platform states and configuration from `localStorage` to the database.
- [x] **Per-Post Platform Checklist**: Add a checklist UI during the creation/upload flow to manually select/deselect which connected platforms should receive the current post.
- [x] **Facebook Native Integration**: Direct API connection for cross-posting to Facebook Pages/Profiles.
- [x] **Account Flexibility**: Should be able to connect to multiple accounts in single platform.
- [x] **Settings: Disconnect Dashboard**: Add a "Disconnect" button to all platform connections.
- [x] **Settings: Account Identity**: Display exactly which account (name/email) is currently connected for each platform.
- [x] **Testing Infrastructure**: Configured Vitest and implemented comprehensive unit tests for AI-writer, Instagram integration, and the Authentication/Login flow.
- [x] **Settings: Active Connections Only**: In the settings, display the option to connect/disconnect only for apps that are toggled "Enabled" in distribution.
- [x] **Settings: Connection Cards**: Redesign connection rows into responsive small cards (grid layout, 1+ per line).
- [x] **Long Format Video Support**: Support for uploading and managing long-form content.
- [x] **Post Success Visuals**: Add visual check marks to platform pills in the distribution checklist after successful individual uploads.
- [x] **Fault-Tolerant Dispatching**: Update the sequential upload loop so that a failure on one platform (e.g., Facebook) does not stop the distribution to others.
- [x] **Sticky Platform Selection**: Persist the user's platform selection preferences so they don't have to re-select their favorite channels for every new post.
- [x] **Sticky Video Format**: Persist the user's target video format choice (Short/Long) across sessions.
- [x] **Cloudflared Implementation**: Transition from Ngrok to Cloudflare Tunnels for more stable local development and webhook handling.
- [x] **Platform Persistence Fix**: Fix the issue where platforms cannot be checked/unchecked for a new post after a successful upload without a full page reload.
- [x] **Sticky AI Polish (Content Mode)**: Persist the user's target AI content style preference across sessions.
- [ ] **Bug**: AI sometimes generates more than 5 hashtags for Instagram (e.g., 7) despite the 5-hashtag restriction rule.
- [x] **Real-time Error Monitoring**: Integrate Sentry or a similar service to receive instant notifications (Email/Slack) when users encounter runtime crashes.
- [ ] **Mobile App Wrapper (Capacitor)**: Turn Social Studio into a native iOS/Android app by wrapping the responsive web dashboard in a native shell.
- [ ] **Platform Selection Validation**: When no distribution channel is selected and the user clicks "Post", prompt them to select one or enable platforms in Settings.

## Medium Priority 📈
- [x] **Post History & Social Links**: Create a "History" section that stores successfully published posts, including direct links to the uploaded videos on YouTube/Instagram/Facebook.
- [ ] **Upload Resume Capability**: Leverage Meta/YouTube resumable sessions to allow "re-trying" a failed upload without re-sending the entire video file.
- [x] **Form State Persistence**: Automatically save the title, description, and attached video file in the upload form, ensuring they don't lose progress if they switch tabs or accidentally refresh. Video files persisted via IndexedDB.
- [ ] **Dashboard Stats Integration**: Replace the hardcoded MVP stats grid with real performance metrics from YouTube/Instagram [parked for next phase]
- [x] **Scheduling & Calendar Queue**: Plan out posts across platforms and replace the "Upcoming Posts" wireframe on the main view with actual data.
- [x] **Background Publishing Worker**: Implement a cron job or worker service to automatically publish scheduled posts when their time arrives.
- [x] **AI Gen Content Review**: Add review step and disclaimer to verify AI generated content before posting.
- [ ] **Music Trending Engine**: Suggest trending audio for native app selection or AI beat-sync suggestions to append to the video, only free to use audio. [parked for next phase]
- [ ] **Media Gallery**: A centralized view to manage local and uploaded video files.
- [ ] **AI Chatbot**: Intelligent assistant to help upload, schedule, and manage content.
- [ ] **Stop/Abort Posting**: Add a button to stop or abort the uploads platform wise.
- [x] **Parallel Multi-Platform Posting**: Optimize the upload flow by triggering platform fetches in parallel (Promise.all) instead of sequentially.
- [ ] **Dynamic Format Detection**: Dynamically fetch/detect whether an uploaded video should be a Short or Long format based on aspect ratio/duration.
- [ ] **Developer Analytics**: Implement platform usage statistics for the admin/developer to see how users are interacting with the tool.
- [x] **Full AI Generation Pipeline**: Implement AI generation to completely remove all hardcoded mock titles, descriptions, and hashtags from the app.
- [ ] **Upcoming Posts Navigation**: Add a link from the "Upcoming Posts" sidebar items to the full Schedule/Calendar view to allow easier management and rescheduling.

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
- [ ] **Unique Page Titles**: Ensure every tab (Dashboard, History, Schedule, Settings) has its own unique HTML page title.
- [ ] **Notification Utility (Bell Icon)**: Investigate and implement functionality for the currently hardcoded bell icon (e.g., in-app notifications for upload success/failure).
