---
name: gh-project-issue-manager
description: Create enhanced GitHub issues and add them to project board #4 (thoufeeque22/4). Use when the user wants to report a bug or request a feature and ensure it is tracked in the project roadmap.
---

# GitHub Project Issue Manager

Use this skill to create high-quality GitHub issues and automatically link them to the project board.

## Workflow

1. **Information Gathering & Enhancement:**
   - If user provides sparse description, DO NOT create immediately.
   - Analyze codebase/context to infer details.
   - Propose enhanced Title and Body.
   - **Body Structure:**
     - **Context:** Background.
     - **Problem/Goal:** Statement of issue/feature.
     - **Suggested Approach:** Technical hints.
     - **Impact:** Why it matters.
   - If critical info missing, ask 2-3 targeted questions.

2. **Creation:**
   - Use `mcp_github_create_issue` in `thoufeeque22/social-studio-app`.
   - Labels: `roadmap`, `bug`/`feature`, `priority:high/medium/low`.
   - Priority:
     - `high`: Security, core crashes, blocked releases.
     - `medium`: Functional bugs, main features.
     - `low`: Nits, docs, minor enhancements.

3. **Project Linking:**
   - Use `run_shell_command` to add to Project #4:
     ```bash
     gh project item-add 4 --owner "thoufeeque22" --url <ISSUE_URL>
     ```

## Guidelines for Enhancement

- **Bugs:** Check logs/error files or recent changes in `src/`.
- **Features:** Check `docs/` (REQUIREMENTS, ARCHITECTURE) to align.
- **Tone:** Professional, technical, concise.

## Examples

- **Input:** "bug: schedule gone"
- **Enhancement:** 
  - Title: "bug: Regression in schedule visibility/functionality"
  - Body: "The schedule page is returning 404 or showing empty state. Affects user post management. Investigate `src/app/schedule/`."
