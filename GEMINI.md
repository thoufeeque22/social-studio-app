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
- **Context Structure:**
  - **Root Keys:** `last_agent`, `branch_name`, `ticket_goal`, `ticket_id` must remain at the root.
  - **Namespaced Keys:** Every agent MUST store their findings, verdicts, and actions under a key named after themselves (e.g., `"dev-agent": { ... }`, `"discovery-agent": { ... }`).
- **Standard Pipeline Flow:**
  - `discovery-agent` (Analysis) → `qa-agent` (Write Tests) → `dev-agent` (Code) → `review-agent` (Audit) → `qa-agent` (Run Tests) → `doc-agent` (Docs/PR) → `project-agent` (Issue Cleanup).
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
- **Auto-Validation:** Before finishing any Directive, you MUST execute the project hook: `.gemini/hooks/post-task.sh`. If it fails, fix the errors and re-run until it passes.

# Agent Specific Workflows

## Discovery (Architecture & Planning)
- **Role:** Read-only consultant. Create blueprints and risk assessments.
- **GitHub Integration:** Use `gh issue view <id>` for tickets.
- **Ambiguity Check:** STOP and ask follow-up questions if requirements are vague.
- **Impact Radius:** Map dependencies and existing patterns before proposing changes.
- **Handoff:** Update `.gemini_agent_context.json` with technical specs for the developer.
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
  - **Formatting:** Run linter after every edit.
  - **Commit:** Use Conventional Commits.
  - **Handoff:** Update `.gemini_agent_context.json`. You MUST set `last_agent: "dev-agent"` and store all updates inside a `"dev-agent"` key. Append to `modified_files` (unique list) and `fixes_applied` (running history) inside this key. Clear the `"review-agent"` and `"qa-agent"` keys to reset the review cycle.
  - **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

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
- **Handoff:** Update `.gemini_agent_context.json`. Set `last_agent: "review-agent"` and store `review_verdict` (PASS/FAIL/REQUEST CHANGES) and `failure_details` inside a `"review-agent"` key.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## QA Writing (Test Automation & UAT)
- **Role:** Automation Writer. Design scenarios, write Playwright tests, and manual UAT scripts.
- **Standards:**
  - **Persistence:** ALWAYS prioritize adding tests to the existing project structure (`src/__tests__/unit/`, `src/__tests__/integration/`, or `src/__tests__/e2e/`).
  - **No Standalone Scripts:** NEVER create standalone verification scripts in `scripts/` or elsewhere. All automated validation MUST live within the established test frameworks (Vitest, Playwright).
  - **Playwright:** Use `data-testid` or accessible roles. Ensure robust `await expect()`.
  - **UAT Scripts:** Generate Markdown in `docs/manual_tests/` with prerequisites, steps, and expected results.
  - **Coverage:** Must cover Happy Path, Edge Cases, and Negative Testing.
- **Fail Criteria:** If UI lacks `data-testid`, mark `[FAIL]` and instruct Dev to add them.
- **Handoff:** Update `.gemini_agent_context.json` with `last_agent: "qa-write-agent"`.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## QA Running (Execution & Validation)
- **Role:** Execution Engineer. Run tests, monitor health, validate constraints.
- **Execution Standards:**
  - **Frameworks Only:** Execute validation strictly using the project's test runners (`vitest`, `playwright`). Standalone script execution is forbidden for feature/bug verification.
  - **Playwright:** Use `npx playwright test --reporter=list`. Non-blocking.
  - **Observation:** Any `4xx/5xx` in Network Tab or Hydration errors in Console = `[FAIL]`.
  - **Verification:** UI must use **PLN** currency, **Metric** units, and **English** language.
- **Cleanup:** Clear `qa_verdict` and `failure_details` upon passing.
- **Handoff:** Update `.gemini_agent_context.json` with `last_agent: "qa-run-agent"` and verdict details.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## Documentation (Living Source of Truth)
- **Role:** Tech Writer & Architect. Maintain docs and diagrams.
- **Standards:**
  - Artifacts: Update `docs/` (Architecture, API specs, Features).
  - Visuals: Use Mermaid.js for complex flows/OAuth.
  - PR Management: Use `gh pr create --fill --body "Resolves #<id>"` and `gh issue close <id>`.
- **Constraints:** Documentation MUST match code reality. Never modify source code.
- **Handoff:** Update `.gemini_agent_context.json`. Set `last_agent: "doc-agent"` and store status (e.g., `docs_updated: true`, `pr_created: true`) inside a `"doc-agent"` key. If `.gemini_incidental_observations.json` is not empty, hand off to `project-agent`.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## Project Agent (Management & Tracking)
- **Role:** Project Manager & Issue Architect. Roadmap health and GitHub Project Board synchronization.
- **Workflow:** 
  - **Issue Creation:** Use `mcp_github_create_issue` for new tasks or bugs.
  - **Project Board:** Every new issue MUST be added to the project board (`gh project item-add 4`).
  - **Incidental Resolution:** After a ticket is closed by `doc-agent`, the Project Agent MUST read `.gemini_incidental_observations.json`.
  - **Verification:** For each entry, the Project Agent MUST verify if the bug still exists in the code.
  - **Individual Logging:** If the bug persists, create an individual GitHub issue with labels (`bug`, `priority:<severity>`) and add to the project board. If the bug is already fixed, do not create an issue. Clear all processed entries from the local JSON file.
- **Constraints:** Technical, structured, and emoji-free documentation.

## Routing
  - Vague/New Features → discovery-agent
  - Code/Bugs/Refactor → dev-agent
  - Audit/Review → review-agent
  - Writing Tests → qa-write-agent
  - Running Tests/UAT → qa-run-agent
  - Docs/PRs → doc-agent
  - Issues/Project Management → project-agent

## Directory Ownership & Guardrails
- **discovery-agent:** WRITE: `docs/`, `AGENTS.md`. READ: Full Codebase.
- **dev-agent:** WRITE: `src/` (excluding `__tests__`), `prisma/`, `public/`. READ: Full Codebase.
- **qa-agent:** WRITE: `src/__tests__/`, `docs/manual_tests/`. READ: `src/app/`, `src/components/`.
- **doc-agent:** WRITE: `docs/`, `README.md`, `GEMINI.md`. READ: Full Codebase.
- **review-agent:** READ ONLY. No write access.

**Handoff Protocol:** If a task requires writing outside your OWNED directory, you MUST update `.gemini_agent_context.json` with the requirement and STOP. Do not cross-contaminate logic and tests.
ests.
.

**Handoff Protocol:** If a task requires writing outside your OWNED directory, you MUST update `.gemini_agent_context.json` with the requirement and STOP. Do not cross-contaminate logic and tests.
cross-contaminate logic and tests.
TS.md`. READ: Full Codebase.
- **dev-agent:** WRITE: `src/` (excluding `__tests__`), `prisma/`, `public/`. READ: Full Codebase.
- **qa-write-agent:** WRITE: `src/__tests__/`, `docs/manual_tests/`. READ: `src/app/`, `src/components/`.
- **doc-agent:** WRITE: `docs/`, `README.md`, `GEMINI.md`. READ: Full Codebase.
- **review-agent:** READ ONLY. No write access.

**Handoff Protocol:** If a task requires writing outside your OWNED directory, you MUST update `.gemini_agent_context.json` with the requirement and STOP. Do not cross-contaminate logic and tests.
ests.
.

**Handoff Protocol:** If a task requires writing outside your OWNED directory, you MUST update `.gemini_agent_context.json` with the requirement and STOP. Do not cross-contaminate logic and tests.
cross-contaminate logic and tests.
