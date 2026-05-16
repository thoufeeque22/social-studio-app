# Social Studio App: Requirements Specification

## 1. Project Overview
Social Studio is a professional-grade multi-platform video distribution platform designed to help creators publish content to YouTube Shorts, Instagram Reels, and TikTok simultaneously. The platform focuses on high-performance uploads, AI-driven content optimization, and robust background publishing.

## 2. Functional Requirements

### 2.1 Authentication & Account Management
- **Multi-Platform OAuth**: Support for Google (YouTube), Facebook (Instagram/Facebook), and TikTok.
- **Multi-Account Support**: Ability to connect multiple accounts per platform (e.g., two different YouTube channels).
- **Native Bridge**: Full integration with Capacitor for mobile auth flows and native device access.
- **Account Settings**: Toggle distribution on/off per account and disconnect accounts.

### 2.2 Video Upload & Processing
- **Zero-Memory Chunked Upload**: Multi-part upload system to handle large video files without browser memory issues.
- **Server-Side Assembly**: Secure reassembly of file chunks in `src/tmp`.
- **Optimization & Transcoding**: Integrated FFmpeg pipeline for platform-specific video optimization (bitrate, resolution, format).
- **Staging System**: Persistence of uploaded files with a 24-hour expiration and automated cleanup.
- **Storage Quota**: Hard limit of 2GB per user for staged/gallery assets.

### 2.3 AI Vibe-Writer (Intelligence Layer)
- **Metadata Generation**: Use Google Gemini (or local Ollama/Gemma) to generate titles, descriptions, and hashtags.
- **AI Tiers**:
    - **Manual**: User writes all content.
    - **Enrich**: AI improves user's draft.
    - **Generate**: AI creates content from video analysis/metadata.
- **Style Modes**: 
    - **Smart**: Optimized for general engagement.
    - **Gen-Z**: Authentic, low-caps, slang-heavy.
    - **SEO**: Keyword-optimized for search discoverability.
    - **Story**: Narrative-driven captions.
    - **Custom**: User-defined prompt instructions.
- **Platform Tailoring**: Automatic adjustment of metadata constraints (e.g., character limits and hashtag rules).

### 2.4 Distribution Pipeline
- **Parallel Publishing**: Simultaneous upload to all selected platforms via a server-side distributor.
- **Status Tracking**: Real-time progress updates (percentage-based) for each platform.
- **Retry Mechanism**: Resumable upload support for YouTube and error logging for other platforms.
- **Scheduling**: Support for immediate publishing or scheduling for a future date/time.

### 2.5 Unified Dashboard & History
- **Aggregate Stats**: Cross-platform view of views and subscribers (YouTube supported).
- **Post History**: Searchable log of all distributions with platform-specific post IDs and permalinks.

## 3. Technical Architecture

### 3.1 Stack
- **Frontend**: Next.js 16.2.3 (App Router), React 19, Vanilla CSS (CSS Modules), Framer Motion.
- **Backend**: Next.js Server Actions, Route Handlers.
- **Database**: PostgreSQL (via Prisma ORM).
- **Auth**: Auth.js (NextAuth) v5.
- **Video Processing**: FFmpeg (via `fluent-ffmpeg`).
- **Worker**: Persistent `tsx` process for scheduled tasks and asset purge.
- **AI**: Google Generative AI (Gemini) with local LLM fallback support (Ollama).
- **Mobile**: Capacitor (Android/iOS) wrapping the Next.js web app.

### 3.2 Platform Integrations
- **YouTube**: Google APIs (OAuth2, YouTube Data API v3).
- **Instagram**: Facebook Graph API (Instagram Graph API).
- **Facebook**: Facebook Graph API (Video/Reels API).
- **TikTok**: TikTok Content Posting API.
- **Local**: Mock platform for internal testing and verification.
- **Planned**: Twitter/X, LinkedIn.

## 4. Non-Functional Requirements

### 4.1 Performance
- **Streaming Parsers**: Efficient handling of file streams to minimize memory footprint.
- **Concurrency**: Parallel distribution tasks handled by the server-side worker.
- **Optimistic UI**: Immediate UI feedback for settings changes and metadata edits.

### 4.2 Security
- **Token Auditing**: Comprehensive logging of OAuth token events (Access, Refresh, Revoke).
- **Data Privacy**: Secure storage of refresh tokens in the database; no credentials exposed to client.
- **Ownership Validation**: Multi-tenant isolation at the database level.

### 4.3 Reliability
- **Locking Mechanism**: Immediate "isPublished" flag toggle to prevent double-posting by multiple worker ticks.
- **Asset Resilience**: Sidecar metadata storage for reviewed content to ensure data persistence during the publish cycle.

## 5. System Constraints & Future Scope
- **Storage**: Temporary staging in `src/tmp` with automated hourly purge.
- **Mobile Native**: Already integrated via Capacitor; future work involves deeper native plugin usage.
- **Advanced Analytics (Phase 2)**: 
    - Visual dashboards featuring cross-platform follower growth, view trends, and engagement metrics.
    - Automated daily data aggregation from YouTube, TikTok, and Instagram APIs.
    - Historical trends visualization using Recharts or similar.

