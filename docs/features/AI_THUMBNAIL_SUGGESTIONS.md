# AI Thumbnail Suggestions Architecture

## 1. Overview
The AI Thumbnail Suggestions feature analyzes uploaded videos to recommend high-click-through-rate (CTR) thumbnails. By extracting keyframes and evaluating them via a multimodal Vision LLM (e.g., Gemini 1.5 Pro/Flash or OpenAI GPT-4o), the system presents the user with the most engaging frame to use for their social media posts.

## 2. Dual-Agent Discovery Brainstorming

### Advocate Persona (User Value & Happy Path)
- **User Flow:** A user uploads a video via the Dashboard/Media Library. Once uploaded, the system automatically suggests 3-4 highly engaging frames.
- **Value Proposition:** Reduces friction in content creation. Eliminates the need to manually scrub video timelines or design custom thumbnails for platforms that allow custom covers (YouTube, TikTok, Instagram).
- **Criteria for CTR:** AI should look for clear faces showing emotion, high contrast, readable action, rule of thirds, and minimal motion blur.

### Skeptic Persona (Risks, Tech Debt & Negative Path)
- **Performance & Latency:** Extracting frames with `ffmpeg` and sending them to an AI API is slow. **Must be asynchronous**. It should not block the initial video upload pipeline.
- **Cost:** Sending dozens of frames to a Vision API per upload is expensive. We must limit extraction to max 3-5 frames (e.g., at 20%, 40%, 60%, 80% marks).
- **API Failures:** If the AI provider rate-limits or goes down, the UI must gracefully fall back to a default static thumbnail without breaking the app.
- **Storage Management:** Extracted candidate frames should be temporarily stored (or kept only in memory/base64) and purged once a final thumbnail is selected, mitigating storage bloat.
- **Edge Cases:** Videos shorter than 2 seconds, entirely black videos, or audio-only files will break the pipeline. Pre-flight checks are mandatory.

## 3. Implementation Strategy & Blueprint

### A. Video Processing (Frame Extraction)
- **Location:** `src/lib/video/processor.ts` (or new `thumbnail.ts`).
- **Method:** Use `fluent-ffmpeg` to extract frames at specific intervals or scene changes.
  ```typescript
  // Example intervals: 25%, 50%, 75% of duration.
  // Output as temporary JPEG files.
  ```
- **Filter:** Ensure extracted frames are resized to a maximum width of 1080px to save bandwidth before sending to the AI.

### B. AI Vision Integration
- **Location:** `src/lib/core/ai.ts` or `src/lib/platforms/ai-thumbnail.ts`.
- **Method:** Integrate the preferred Vision API (Google Gemini or OpenAI). Send the 3-5 extracted frames as base64 images in a single prompt.
- **Prompt Architecture:**
  *"You are an expert social media manager. I am providing X frames from a video. Analyze them for high Click-Through-Rate (CTR) potential. Look for faces, expressions, high contrast, and clear action. Rank them and return the index of the best frame. Respond in strict JSON format: { "bestFrameIndex": 2, "reasoning": "Clear emotional face with good lighting." }"*

### C. Data Flow & UI
- **Action/API Route:** Create a new Next.js Server Action or API route (`/api/media/thumbnails`) to trigger the generation on-demand or as a background queue.
- **UI Updates:** Extend `MediaLibrary.tsx` or the post composer to include an "Auto-Generate Thumbnails" button or display a skeleton loader while background processing completes.

## 4. Production Readiness

- **Logging (Sentry):** 
  - Log the latency of the `ffmpeg` extraction and the AI API call.
  - Capture and log any Vision API timeouts or format errors without crashing the main application.
- **Caching:** 
  - Store the generated thumbnails array in the database (or Redis) tied to the `fileId` to prevent regenerating for the same video.
- **Rate-Limiting (Upstash Redis):**
  - Enforce a strict rate limit for AI thumbnail generations (e.g., 10 generations per user per day) in `src/lib/core/ratelimit.ts` to control API costs.
- **Cleanup:**
  - Unused thumbnail variations must be deleted from temporary storage/S3 after the user selects their preferred thumbnail.
