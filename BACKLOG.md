# Social Studio Backlog

This document tracks future features and improvements for the Social Studio App.

## High Priority 🚀
- [ ] **TikTok Production Rollout**: Submit Developer App for audit to remove Sandbox mode restrictions and fully unlock public posting capability.
- [ ] **Default Connection Selection**: Automatically enable the first connected account by default in the post-creation UI to reduce manual clicks.

## Medium Priority 📈
- [ ] **AI 3-Tier Strategy Implementation**: Refactor the AI content pipeline into three distinct user paths (Manual, Enrich, Generate) to establish the architectural foundation for all future AI features.
- [ ] **Upload Resume Capability**: Leverage Meta/YouTube resumable sessions to allow "re-trying" a failed upload without re-sending the entire video file.
- [ ] **Stop/Abort Posting**: Add a button to stop or abort the uploads platform wise for better user control and safety.
- [ ] **Dynamic Format Detection**: Dynamically fetch/detect whether an uploaded video should be a Short or Long format based on aspect ratio/duration.
- [ ] **Scheduled Video Lifecycle**: Investigate where scheduled videos are stored, implement storage limits, and add an **expiry/cleanup policy** to manage disk space automatically.
- [ ] **Platform-Specific Metadata**: Allow users to provide different titles and descriptions for different platforms (e.g., a formal title for YouTube and a casual one for TikTok).
- [ ] **Dashboard Stats Integration**: Replace the hardcoded MVP stats grid with real performance metrics from YouTube/Instagram [parked for next phase].
- [ ] **Upcoming Posts Navigation**: Add a link from the "Upcoming Posts" sidebar items to the full Schedule/Calendar view to allow easier management and rescheduling.
- [ ] **Platform-Specific AI Intelligence**: Train/Prompt AI to specifically tailor content for each platform's culture (YT Search vs TikTok Hooks).
- [ ] **AI Thumbnail Suggestions**: Extract key frames from uploaded videos to suggest high-click-through-rate thumbnails.
- [ ] **Media Gallery**: A centralized view to manage local and uploaded video files.
- [ ] **AI Chatbot**: Intelligent assistant to help upload, schedule, and manage content.
- [ ] **Music Trending Engine**: Suggest trending audio for native app selection or AI beat-sync suggestions to append to the video (free-to-use only).
- [ ] **AI Feature Highlighting**: Implement subtle UI "nudges" (e.g., a "Sparkle" icon or "Try AI Polish" badge) to suggest AI features.
- [ ] **Developer Analytics**: Implement platform usage statistics for the admin/developer to see how users are interacting with the tool.

## Low Priority 🛠️
- [ ] **Technical SEO Foundation**: Implement landing page, dynamic metadata, and schema markup to improve search visibility.
- [ ] **AI Studio Billing Check**: Routine check of prepaid billing / credits in AI studio to avoid unexpected stoppage.
- [ ] **Mobile UX: Safe Areas**: Ensure the UI respects "Safe Areas" (notches, dynamic islands) for the native mobile wrapper.
- [ ] **Unique Page Titles**: Ensure every tab (Dashboard, History, Schedule, Settings) has its own unique HTML page title for SEO and UX.
- [ ] **Video Preview**: Integrated video player to review content before posting.
- [ ] **Notification Utility (Bell Icon)**: Implement functionality for the bell icon (e.g., in-app notifications for upload success/failure).
- [ ] **Dark/Light Mode Toggle**: Professional theme switching.
- [ ] **Legal & Compliance**:
    - [ ] **Terms and Conditions**: Draft and implement T&Cs.
    - [ ] **Policies**: Draft and implement Privacy Policy.
    - [ ] **Legal Review**: General review for platform compliance.
- [ ] **Support Email**: Set up and display support contact information.
- [ ] **Documentation**: Create user enablement and developer documentation.

## Platform Expansion 🌐

### Tier 1: Open & Developer-Friendly ✅
*Low friction, quick integration, no expensive fees.*
- [ ] **Telegram Channels** (~1B MAU): Direct-to-audience broadcasting. **[EASY]** Uses Bot API.
- [ ] **Discord Integration**: Essential for niche communities and creators. **[EASY]** Uses Webhooks/Bots.
- [ ] **WordPress Integration**: Publish content directly to self-hosted blogs. **[EASY]** Uses REST API.
- [ ] **Bluesky Integration** (~20M+ MAU): Emerging decentralized protocol. **[EASY]** Uses AT Protocol.
- [ ] **Mastodon Integration** (~10M+ MAU): Federated social networking. **[EASY]** Uses Mastodon API.
- [ ] **Truth Social Integration** (~6.3M MAU): Support for alternative social audiences. **[EASY]** Mastodon-based.

### Tier 2: Audit & Review Required ⚠️
*Official public APIs exist, but require app submission and manual audit.*
- [ ] **Facebook Integration** (~3B+ MAU): **[MODERATE]** Requires Meta App Review & Business Verification.
- [ ] **YouTube Integration** (~2.5B MAU): **[MODERATE]** Requires Google Cloud project audit.
- [ ] **Instagram Integration** (~2B+ MAU): **[MODERATE]** Requires Instagram Content Publishing API review.
- [ ] **TikTok Integration** (~1.5B MAU): **[MODERATE]** Requires ByteDance Production App audit.
- [ ] **LinkedIn Integration** (~930M+ Reg.): **[MODERATE]** Requires Marketing Developer Program approval.
- [ ] **Pinterest Integration** (~540M MAU): **[MODERATE]** Requires Content Publishing API review.
- [ ] **Threads Integration** (~400M MAU): **[MODERATE]** Uses Threads API (Meta Review required).

### Tier 3: Expensive or Highly Restricted 🛑
*High monthly costs or restricted access policies.*
- [ ] **X (Twitter) Integration** (~600M+ MAU): **[COSTLY]** Requires paid API tier ($100/mo - $5,000/mo).
- [ ] **Snapchat (Spotlight)** (~850M MAU): **[RESTRICTED]** Creative Kit is limited; full posting API is gatekept.
- [ ] **Google Business Profile (GBP)**: **[RESTRICTED]** API access involves a tedious review process.

### Tier 4: Future / No Public API 🔒
*Currently no official way to automate posting.*
- [ ] **Lemon8 Integration**: **[CLOSED]** No public API yet; requires manual share intent workflow.

---

---

## Completed ✅
- [x] **Initial Project Structure**: Next.js + Tailwind (v4) setup.
- [x] **Project Modularization**: Refactored monolithic pages into reusable components and shared hooks for better maintainability.
- [x] **YouTube Direct Upload**: OAuth2 integration for Shorts/Videos.
- [x] **Instagram Reels Native Integration**: Direct API connection for cross-posting Reels & Graph API Orchestration.
- [x] **Remove FFmpeg Muxing engine**: Completely stripped the Muxing/Audio-Burn feature to return to a stable, native-audio-only upload system.
- [x] **Main App Authentication & Authorization (A&A)**: Secure the application with robust user accounts and roles.
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
- [x] **Real-time Error Monitoring**: Integrate Sentry or a similar service to receive instant notifications (Email/Slack) when users encounter runtime crashes.
- [x] **Mobile App Wrapper (Capacitor)**: Turn Social Studio into a native iOS/Android app by wrapping the responsive web dashboard in a native shell.
- [x] **Post History & Social Links**: Create a "History" section that stores successfully published posts, including direct links to the uploaded videos on YouTube/Instagram/Facebook.
- [x] **Form State Persistence**: Automatically save the title, description, and attached video file in the upload form, ensuring they don't lose progress if they switch tabs or accidentally refresh. Video files persisted via IndexedDB.
- [x] **Scheduling & Calendar Queue**: Plan out posts across platforms and replace the "Upcoming Posts" wireframe on the main view with actual data.
- [x] **Background Publishing Worker**: Implement a cron job or worker service to automatically publish scheduled posts when their time arrives.
- [x] **AI Gen Content Review**: Add review step and disclaimer to verify AI generated content before posting.
- [x] **Parallel Multi-Platform Posting**: Optimize the upload flow by triggering platform fetches in parallel (Promise.all) instead of sequentially.
- [x] **Full AI Generation Pipeline**: Implement AI generation to completely remove all hardcoded mock titles, descriptions, and hashtags from the app.
- [x] **Header Navigation**: "Create Post" active scrolling.
- [x] **Bug**: AI sometimes generates more than 5 hashtags for Instagram (e.g., 7) despite the 5-hashtag restriction rule.
- [x] **Platform Selection Validation**: When no distribution channel is selected and the user clicks "Post", prompt them to select one or enable platforms in Settings.
- [x] **Auth Redirect Performance**: Investigate and fix delays when navigating from the initial dashboard to the login page (unauthenticated) and from login back to the dashboard (authenticated). Aim for near-instantaneous transitions.
