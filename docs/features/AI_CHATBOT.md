# AI Chatbot Feature

## Overview
The AI Chatbot introduces an intelligent, conversational interface into Social Studio, enabling users to effortlessly manage their content, explore staged media, and schedule video distribution via natural language commands. The chatbot appears as a Floating Action Button (FAB) in the bottom-right corner and opens a glassmorphism chat interface.

## Core Capabilities
The assistant leverages tool-calling capabilities provided by the Vercel AI SDK to perform several discrete actions:

- **List Upcoming Posts (`list_upcoming_posts`)**: Fetches and lists the user's scheduled (unpublished) posts.
- **View Staged Media (`get_media_gallery`)**: Provides a list of videos currently in the user's media gallery (staged files that have not yet expired), necessary for creating new schedules.
- **Schedule Video (`schedule_video`)**: Automatically stages a video for publishing based on user-provided natural language parameters (e.g., Title, Time, Platforms).
- **Update Post (`update_post`)**: Adjusts the title, description, or scheduled time of an existing scheduled post.
- **Cancel Post (`cancel_post`)**: Deletes an upcoming scheduled post.

## Technical Implementation

### Architecture
- **Vercel AI SDK v6**: Manages state, streaming, and tool execution securely on the server-side.
- **Model Support**: Defaults to Google Gemini (`gemini-1.5-flash-latest`), but features a strict local fallback mechanism. When running locally (with `USE_OLLAMA=true`), the system defaults to a local Ollama instance running `gemma4:latest`, allowing developers to test AI integration without consuming external API credits.
- **UI Framework**: Utilizes React (`useChat`), Material UI components, and Framer Motion for animations. The interface handles streaming tool invocations resiliently.

### Production Readiness
- **Rate Limiting**: Protected by Upstash Redis to prevent abuse.
- **Logging**: Integrated with Sentry to log tool execution errors and chat API failures.
- **Resilience**: The Chat UI gracefully handles edge cases such as missing tool outputs, non-text message chunks during streaming, and network failures.

## E2E Validation
Automated End-to-End verification is located in `src/__tests__/e2e/chat.spec.ts`, executed by Playwright. The tests cover the happy path for chatting and scheduling videos, robustly waiting for UI feedback across both high-speed cloud models and slower local models (Ollama).