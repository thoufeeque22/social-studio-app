# Social Studio App: Requirements Specification

## 1. Project Overview
Social Studio is a professional-grade multi-platform video distribution platform designed to help creators publish content to YouTube Shorts, Instagram Reels, and TikTok simultaneously. The platform focuses on high-performance uploads, AI-driven content optimization, and robust background publishing.

## 2. Functional Requirements

### 2.1 Authentication & Account Management
- **Multi-Platform OAuth**: Support for Google (YouTube), Facebook (Instagram/Facebook), and TikTok.
- **Multi-Account Support**: Ability to connect multiple accounts per platform (e.g., two different YouTube channels).
- **Native Bridge**: Compatibility with Capacitor for mobile auth flows.
- **Account Settings**: Toggle distribution on/off per account and disconnect accounts.

### 2.2 Video Upload & Processing
- **Zero-Memory Chunked Upload**: Multi-part upload system to handle large video files without browser memory issues.
- **Server-Side Assembly**: Secure reassembly of file chunks on the server before distribution.
- **Staging System**: Persistence of uploaded files until final distribution or cleanup.

### 2.3 AI Vibe-Writer (Intelligence Layer)
- **Metadata Generation**: Use Google Gemini to generate titles, descriptions, and hashtags.
- **Style Modes**: 
    - **Hook**: Click-driven, high FOMO.
    - **SEO**: Keyword-optimized for search.
    - **Gen-Z**: Authentic, low-caps, slang-heavy.
- **Platform Tailoring**: Automatic adjustment of metadata constraints (e.g., YouTube Shorts character limits).

### 2.4 Distribution Pipeline
- **Parallel Publishing**: Simultaneous upload to all selected platforms.
- **Status Tracking**: Real-time polling and feedback for each platform's upload status.
- **Retry Mechanism**: Ability to retry failed uploads from the History page.
- **Scheduling**: Support for "Publish Now" or scheduling for a future date.

### 2.5 Unified Dashboard & History
- **Aggregate Stats**: Cross-platform view of views, reach, and follower growth.
- **Post History**: Searchable log of all distributions with platform-specific post IDs and links.

## 3. Technical Architecture

### 3.1 Stack
- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS, Framer Motion.
- **Backend**: Next.js Server Actions, Route Handlers.
- **Database**: PostgreSQL (via Prisma ORM).
- **Auth**: NextAuth.js.
- **Worker**: Custom server-side polling worker for scheduled tasks.
- **AI**: Google Generative AI (Gemini Flash).

### 3.2 Platform Integrations
- **YouTube**: Google APIs (OAuth2, YouTube Data API v3).
- **Instagram**: Facebook Graph API (Instagram Graph API, Media Container flow).
- **Facebook**: Facebook Graph API (Video/Reels API).
- **TikTok**: TikTok Open API (Video Kit, OAuth2).

## 4. Non-Functional Requirements

### 4.1 Performance
- **Auth Redirects**: Near-instantaneous transitions between dashboard and login.
- **Concurrent Uploads**: Distribution queue limited to avoid server resource exhaustion.
- **Optimistic UI**: Immediate UI feedback for settings changes (toggles, deletions).

### 4.2 Security
- **Data Privacy**: No sensitive code or environment variables sent to client-side.
- **Token Management**: Secure storage and automatic refreshing of OAuth tokens.
- **Ownership Validation**: Strict checks to ensure users can only access/modify their own data.

### 4.3 Reliability
- **Fault Tolerance**: Failure on one platform does not interrupt publishing on others.
- **State Resilience**: Recovery of partial uploads or pending distribution tasks after server restarts.

## 5. System Constraints & Future Scope
- **Storage**: Temporary staging of files on server disk until publication.
- **API Rate Limits**: Compliance with platform-specific quotas (YouTube/TikTok/FB).
- **Future**: Mobile app release (Capacitor), advanced analytics, and AI video editing hooks.
