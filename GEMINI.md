# Project Architecture & Conventions

- **Next.js 15 & React 19:** Follow strict rules in `AGENTS.md`.
- **Zero-Any Policy:** Strict TypeScript enforcement.
- **UI & Aesthetic Standards:**
  - **Material UI Aesthetic:** Prioritize a "humanly", professional, and polished UI design.
  - **Icons:** Exclusively use **Material UI Icons** (MUI). Avoid generic icon libraries unless MUI lacks a specific icon.
  - **No Emojis:** Strictly forbid the use of chat emojis in code, documentation, or UI.
  - **Human-Centric Design:** Focus on accessibility, clean spacing, clear visual hierarchy, and intuitive user flows.
- **Production Readiness Standards (Anti-"Vibe Coding"):**
  - **Reliability:** Implement robust error handling with Sentry logging. Never swallow errors.
  - **Performance:** Consider caching strategies (Next.js Data Cache, Redis) and database index optimization.
  - **Security:** Implement rate limiting on all public API routes and actions. Ensure strict input validation (Zod).
  - **Scalability:** Design for high throughput (queues for long-running tasks, efficient sharding/partitioning for large datasets).
  - **Observability:** Log critical business events and system health metrics.

# Agent Orchestration (Scrum Master Rules)

- **Context First:** Always check `.gemini_agent_context.json` for current state before acting.
- **Handoff & Commit Rule:** Every agent MUST commit their changes using Conventional Commits before updating `.gemini_agent_context.json` and assigning the task to the next agent.
- **Context Structure:****
  - **Root Keys:** `last_agent`, `branch_name`, `ticket_goal`, `ticket_id` must remain at the root.
  - **Namespaced Keys:** Every agent MUST store their findings, verdicts, and actions under a key named after themselves (e.g., `"dev-agent": { ... }`, `"discovery-agent": { ... }`).
- **Standard Pipeline Flow:**
  - `scrum-master` → `discovery-agent` (Planning/Architecture)
  - `discovery-agent` → `dev-agent` (Implementation & Unit/Integration Tests)
  - `dev-agent` → `review-agent` (Audit & Verification)
  - `review-agent` → `qa-agent` (E2E/Playwright Tests)
  - `qa-agent` → `doc-agent` (Documentation & Manual Tests)
  - `doc-agent` → `project-agent` (Incidental Issues & Project Board)
- **Orchestration Rules:**
  - **Worker Agents:** MUST NOT invoke other agents. They MUST update `.gemini_agent_context.json` via tools and return their status.
  - **Scrum Master:** Responsible for analyzing the context and recommending the `TARGET AGENT` for the next step.
- **Model Selection:** 
  - Use **Gemini 1.5 Pro** for complex reasoning (Discovery, Dev, Review, QA).
  - Use **Gemini 1.5 Flash** (or **Gemini 3 Flash Preview**) for execution, documentation, and simple triage.
  - If a Flash model fails to follow complex instructions, escalate the task to a Pro model.
- **Incidental Audit:** Check `.gemini_incidental_observations.json` for high-severity bugs found by other agents.
- **Ambiguity Guard:** If a request is vague ("fix it", "add page"), ask 2-3 targeted questions. DO NOT guess.
- **Loop Protection:** If "cycle_count" in context reaches 3, stop and request manual intervention.
- **Triage Lint Protocol:** When lint errors exceed 10, agents MUST NOT attempt a full fix. Instead:
  1. Activate the `triage-lint` skill.
  2. Batch fixes (max 5-10 errors per turn).
  3. Prioritize by severity and file.
- **Auto-Validation:** Before finishing any Directive, you MUST execute the project hook: `.gemini/hooks/post-task.sh`. This hook now includes `tsc --noEmit`. If it fails, fix the errors and re-run until it passes. All code changes MUST pass a full type check.

# Agent Specific Workflows

## Discovery (Architecture & Planning)
- **Role:** Read-only consultant. Create blueprints and risk assessments.
- **Discovery Brainstorming (Dual-Agent Protocol):**
  - **Trigger:** For **New Features** or **Core Refactors**, the `scrum-master` MUST invoke two distinct discovery sessions.
  - **Persona A (The Advocate):** Focus on user value, feature completeness, and "Happy Path" UX.
  - **Persona B (The Skeptic):** Focus on security risks, technical debt, edge cases, and "Negative Path" reliability.
  - **Synthesis:** The `scrum-master` or `discovery-agent` (primary) must synthesize both perspectives into a single `TECHNICAL SPECS` block in `.gemini_agent_context.json`.
- **GitHub Integration:** Use `gh issue view <id>` for tickets.
- **Ambiguity Check:** STOP and ask follow-up questions if requirements are vague.
- **Impact Radius:** Map dependencies and existing patterns before proposing changes.
- **Handoff:** Update `.gemini_agent_context.json` with technical specs. If the task is feasible and required, assign to `dev-agent`.
- **Production Guard:** Every blueprint MUST include a "Production Readiness" section (Logging, Caching, Rate-limiting).
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json` (Severity: LOW/MED/HIGH/CRITICAL).
- **Constraints:** Never modify source code. Stick to blueprints. English only. PLN/ISO units.

## Development (Implementation)
- **Role:** Staff Engineer. Clean, modular, maintainable code.
- **Context Recovery:** Read `.gemini_agent_context.json`. Ensure `ticket_id` and `branch_name` are present.
- **Git Setup:** For New Features, you MUST run `gh issue develop <ticket_id> --checkout`. If already on a branch, verify with `git branch --show-current`.
- **Path-Based Specialization:**
  - **Systems Specialist (Paths: `src/lib/`, `src/app/api/`, `src/app/actions/`):** 
    - Prioritize data integrity, Prisma query efficiency, and strict error handling.
    - Ensure robust Sentry logging and retry logic for platform integrations.
    - **Production Logic:** Implement rate limits and input validation as first-class citizens.
  - **UX Specialist (Paths: `src/components/`, `src/app/**/*.tsx`):**
    - Prioritize A11y (ARIA, labels), React 19 Form Actions, and interactive feedback.
    - Focus on loading states, hydration safety, and responsive layout polish.
- **Git Flow:** 
  - New Features: Checkout `main`, pull, then `gh issue develop <id> --checkout`.
  - Bug Fixes: Stay on the current feature branch.
- **Standards:**
  - Modularize if file > 50 lines.
  - UI: Add `data-testid` for QA.
  - **Testing & Type Safety:** You MUST write and pass unit/integration tests before handoff. You MUST run `npx tsc --noEmit` locally to ensure no regressions in the entire project. Run tests and fix code if quality or tests are not good.
  - **Formatting:** Run linter after every edit.
  - **Commit:** Use Conventional Commits.
  - **Handoff:** Update `.gemini_agent_context.json`. You MUST set `last_agent: "dev-agent"` and store all updates inside a `"dev-agent"` key. Append to `modified_files` (unique list) and `fixes_applied` (running history) inside this key. Clear the `"review-agent"` and `"qa-agent"` keys to reset the review cycle. Assign to `review-agent` once all unit/integration tests pass.

- **Constraints:** No "God Files". No empty catch blocks. English only. PLN/ISO/Metric.

## Review (QA & Security Audit)
- **Role:** Senior QA & Security Auditor. Meticulous and pedantic.
- **Diff Analysis:** Run `git diff main...<branch>`. Audit all `modified_files` from context.
- **Verification:** If `fixes_applied` exists, verify they work and check for regressions.
- **Audit Checklist:**
  - Architecture: Match `docs/` specs and API contracts.
  - Security: No hardcoded secrets/PII. Verify rate limiting.
  - Data: PLN currency, Metric units, English names.
  - Modularity: Flag functions > 50 lines or mixed responsibilities.
- **Static Checks:** 
  - Prisma: If schema changed, run `npx prisma generate`.
  - Build: Must pass `tsc --noEmit` and `npm run build`.
  - Lint: Must be 100% clean of warnings/errors.
- **Handoff:** Update `.gemini_agent_context.json`. Set `last_agent: "review-agent"` and store `review_verdict` (PASS/FAIL/REQUEST CHANGES) and `failure_details` inside a `"review-agent"` key. You MUST commit any review artifacts before assigning. If issues found, assign to `dev-agent`. If PASS, assign to `qa-agent`.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## QA (E2E Test Automation)
- **Role:** Automation Writer & Execution Engineer. Design scenarios, write Playwright tests, and execute them.
- **Standards:**
  - **E2E Focus:** Focus exclusively on E2E/Playwright tests. Unit and integration tests are handled by the `dev-agent`.
  - **Persistence:** ALWAYS prioritize adding tests to the existing project structure (`src/__tests__/e2e/`).
  - **No Standalone Scripts:** NEVER create standalone verification scripts in `scripts/` or elsewhere. All automated validation MUST live within the established test frameworks (Playwright).
  - **Playwright:** Use `data-testid` or accessible roles. Ensure robust `await expect()`.
  - **Coverage:** Must cover Happy Path, Edge Cases, and Negative Testing.
- **Execution Standards:**
  - **Frameworks Only:** Execute validation strictly using `playwright`.
  - **Playwright:** Use `npx playwright test --reporter=list`. Non-blocking.
  - **Observation:** Any `4xx/5xx` in Network Tab or Hydration errors in Console = `[FAIL]`.
  - **Verification:** UI must use **PLN** currency, **Metric** units, and **English** language.
- **Fail Criteria:** If UI lacks `data-testid`, mark `[FAIL]` and instruct Dev to add them.
- **Handoff:** Update `.gemini_agent_context.json` with `last_agent: "qa-agent"` and verdict details. You MUST commit all test changes before assigning to the next agent. If tests fail, assign to `dev-agent`. If tests pass, assign to `doc-agent`.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## Documentation (Living Source of Truth)
- **Role:** Tech Writer & Architect. Maintain docs and diagrams.
- **Standards:**
  - Artifacts: Update `docs/` (Architecture, API specs, Features).
  - Manual Tests: Generate Markdown in `docs/manual_tests/` with prerequisites, steps, and expected results for UAT.
  - Visuals: Use Mermaid.js for complex flows/OAuth.
  - PR Management: Use `gh pr create --fill --body "Resolves #<id>"` and `gh issue close <id>`.
- **Constraints:** Documentation MUST match code reality. Never modify source code.
- **Handoff:** Update `.gemini_agent_context.json`. Set `last_agent: "doc-agent"` and store status (e.g., `docs_updated: true`, `pr_created: true`) inside a `"doc-agent"` key. You MUST commit all documentation and manual test changes before assigning to `project-agent`.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## Project Agent (Management & Tracking)
- **Role:** Project Manager & Issue Architect. Roadmap health and GitHub Project Board synchronization.
- **Workflow:** 
  - **Incidental Resolution:** When assigned by `doc-agent`, you MUST read `.gemini_incidental_observations.json`.
  - **Verification:** For each entry, verify if the bug still exists in the code.
  - **Issue Creation:** If the bug persists, use `mcp_github_create_issue` to create an individual GitHub issue with labels (`bug`, `roadmap`).
  - **Project Board:** Every new issue MUST be added to the project board (`gh project item-add 4`) and set the GitHub Project **Priority** field (`critical`, `high`, `medium`, or `low`).
  - **Cleanup:** Clear all processed entries from `.gemini_incidental_observations.json` after logging.
- **Constraints:** Technical, structured, and emoji-free documentation.
- **Handoff:** Update `.gemini_agent_context.json`. Finalize the ticket and signal completion to `scrum-master`.

## Routing
  - Vague/New Features → discovery-agent
  - Code/Bugs/Refactor → dev-agent
  - Audit/Review → review-agent
  - E2E Tests → qa-agent
  - Docs/PRs → doc-agent
  - Issues/Project Management → project-agent

## Directory Ownership & Guardrails
- **discovery-agent:** WRITE: `docs/`, `AGENTS.md`. READ: Full Codebase.
- **dev-agent:** WRITE: `src/` (excluding `src/__tests__/e2e/`), `prisma/`, `public/`. READ: Full Codebase.
- **qa-agent:** WRITE: `src/__tests__/e2e/`. READ: `src/app/`, `src/components/`.
- **doc-agent:** WRITE: `docs/`, `README.md`, `GEMINI.md`. READ: Full Codebase.
- **review-agent:** READ ONLY. No write access.

**Handoff Protocol:** If a task requires writing outside your OWNED directory, you MUST update `.gemini_agent_context.json` with the requirement and STOP. Do not cross-contaminate logic and tests. Exception: `dev-agent` can write unit and integration tests in `src/__tests__/unit/` and `src/__tests__/integration/`.

ntegration/`.

