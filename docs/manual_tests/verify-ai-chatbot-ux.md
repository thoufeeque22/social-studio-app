# UAT: AI Chatbot UX & Conversational Flow

## Prerequisites
- User is logged into the Social Studio App.
- At least one video is present in the "Staged Media" gallery.
- Some posts are already scheduled (to test "Show my schedule").

## Scenarios

### 1. UI Polish & Animations
- **Step 1:** Observe the bottom-right corner of the dashboard.
- **Expected:** A Floating Action Button (FAB) with the `AutoAwesome` MUI icon is visible.
- **Step 2:** Click the FAB.
- **Expected:** The chat window slides in smoothly from the bottom/side (Framer Motion). The window has a glassmorphism effect (semi-transparent, blurred background).
- **Step 3:** Resize the browser or use a mobile view.
- **Expected:** The chat window adapts gracefully to the screen size.

### 2. Basic Conversational Flow
- **Step 1:** Type "Hello" and press Enter.
- **Expected:** User message appears on the right. AI response appears on the left, streaming in character-by-character or word-by-word.
- **Step 2:** Ask "Who are you?".
- **Expected:** AI identifies as "Social Studio AI Assistant" and briefly mentions its capabilities (listing/scheduling posts).

### 3. Tool: List Upcoming Posts
- **Step 1:** Type "Show my upcoming posts" or "What's on my schedule?".
- **Expected:** A UI indicator should appear showing the tool being called (e.g., `Using list_upcoming_posts`), and then the AI acknowledges the request, "looks up" the schedule, and lists the titles and dates of upcoming posts.

### 4. Tool: Schedule Video (Happy Path)
- **Step 1:** Type "Schedule the video 'My Intro' for next Monday at 2 PM".
- **Expected:** 
  - A UI indicator should appear showing the scheduling tool in action.
  - The AI should identify the video (if uniquely named) or ask for clarification using `get_media_gallery`.
  - The AI should confirm the parameters: Title, Description (if provided or inferred), Scheduled Date/Time, and Platforms.
  - Upon final confirmation, the AI should state that the video has been successfully scheduled.
- **Step 2:** Navigate to the "Schedule" page.
- **Expected:** The new post is visible at the correct time.

### 5. Error Handling & Human-Centric Feedback
- **Step 1:** Request a non-existent video: "Schedule 'Dancing Cats' for tomorrow" (when no such video exists).
- **Expected:** AI should politely inform the user that it couldn't find a video with that name and perhaps suggest looking at the gallery.
- **Step 2:** Request a schedule in the past: "Schedule 'Intro' for yesterday".
- **Expected:** AI should explain that it cannot schedule posts in the past and ask for a future date.

### 6. Local Testing with Ollama Fallback
- **Step 1:** Disable Google API keys in `.env` or set `USE_OLLAMA=true`, and ensure `ollama` is running with `gemma4:latest`.
- **Expected:** The application successfully defaults to the local model.
- **Step 2:** Interact with the chatbot.
- **Expected:** Responses stream in, tool invocations show successfully, and fallback text appears if the model's text response is empty after tool execution.

### 7. UI Interactions
- **Step 1:** Click the close button in the chat window header.
- **Expected:** Window slides out/closes smoothly.
- **Step 2:** Re-open the chat.
- **Expected:** Previous chat history is preserved.
