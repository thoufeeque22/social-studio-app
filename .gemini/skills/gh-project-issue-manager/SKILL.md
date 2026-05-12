---
name: gh-project-issue-manager
description: Create enhanced GitHub issues and add them to project board #4 (thoufeeque22/4). Use when the user wants to report a bug or request a feature and ensure it is tracked in the project roadmap.
---

# GitHub Project Issue Manager

Use this skill to create high-quality GitHub issues and automatically link them to the project board.

## UI & Aesthetic Standards

- **Material UI Aesthetic:** Prioritize a "humanly" and professional UI design.
- **Icons:** Use **Material UI Icons** (MUI) for visual representation.
- **No Emojis:** Strictly avoid using chat emojis in issue titles, bodies, or UI implementations.
- **Human-Centric Design:** Focus on accessibility, clean spacing, and clear visual hierarchy.

## Workflow

1. **Information Gathering & Enhancement:**
   - If user provides sparse description, DO NOT create immediately.
   - Analyze codebase/context to infer details.
   - Propose enhanced Title and Body using technical, polished language (no emojis).
   - **Body Structure:**
     - **Context:** Background.
     - **Problem/Goal:** Statement of issue/feature.
     - **Suggested Approach:** Technical hints (mentioning MUI components/icons where relevant).
     - **Impact:** Why it matters.
   - If critical info missing, ask 2-3 targeted questions.

2. **Creation:**
   - Use `mcp_github_create_issue` in `thoufeeque22/social-studio-app`.
   - Labels: `roadmap`, `bug`/`feature`, `priority:critical/high/medium/low`.
   - Priority:
     - `critical`: P0 issues, production outages, security vulnerabilities.
     - `high`: Security, core crashes, blocked releases.
     - `medium`: Functional bugs, main features.
     - `low`: Nits, docs, minor enhancements.

3. **Project Linking:**
   - Use `run_shell_command` to add to Project #4:
     ```bash
     gh project item-add 4 --owner "thoufeeque22" --url <ISSUE_URL>
     ```
   - **Handoff:** Update the calling agent's namespaced key in `.gemini_agent_context.json` with the created issue details.

## Guidelines for Enhancement

- **Bugs:** Check logs/error files or recent changes in `src/`.
- **Features:** Check `docs/` (REQUIREMENTS, ARCHITECTURE) to align. Ensure proposed UI changes adhere to MUI standards.
- **Tone:** Professional, technical, human-centric, and concise.
