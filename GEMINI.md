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

# Infrastructure & Database Maintenance

- **Neon Branch Management:** The Neon Vercel integration creates a new database branch for every preview deployment. On the Free Tier (limit 10), this can block deployments.
- **Cleanup Automation:** Use the provided script to purge old branches while keeping `main` and the most recent preview branch:
    ```bash
    npm run cleanup:neon        # Dry Run
    npm run cleanup:neon:force  # Actual Deletion
    ```
- **Project ID:** The script defaults to `falling-feather-78236210`. To override, use `--project-id <id>`.

# Agent Orchestration (Direct Routing)

- **Context First:** Always check `.gemini_agent_context.json` for current state before acting.
- **Handoff & Commit Rule:** Every agent MUST commit their changes (including `.gemini_agent_context.json`) using Conventional Commits and push to the remote branch before assigning the task to the next agent.
- **Context Synchronization:** Always `git add .gemini_agent_context.json` before committing to ensure the latest state is shared. Push changes immediately after commit.
- **Predictive Validation:** Before handoff, the current agent MUST define an `expected_output` block in their namespaced context. This MUST include specific verification commands (e.g., `npm run build`, `npx tsc`) and the expected success indicators. Handoff is FORBIDDEN until the agent can prove these outputs were achieved.
- **Context Structure:**
  - **Root Keys:** `last_agent`, `branch_name`, `ticket_goal`, `ticket_id`, and `last_updated_at` (ISO 8601 timestamp) must remain at the root.
  - **Round-Based Namespacing:** Every agent activity MUST be encapsulated within a `round-N` key (e.g., `"round-1"`). Inside each round, agents MUST store their findings and actions under their specific agent key (e.g., `"round-1": { "dev-agent": { ... } }`).
  - **History:** If a pipeline fails and cycles back, a new round (e.g., `"round-2"`) MUST be created, containing the new agent activities. This preserves the complete historical record of previous rounds. Each agent entry MUST include a `"timestamp"` (ISO 8601).
- **Standard Pipeline Flow:**
  - `discovery-agent` → `dev-agent`
  - `dev-agent` → `review-agent`
  - `review-agent` → `qa-agent` (on PASS) or `dev-agent` (on FAIL)
  - `qa-agent` → `doc-agent` (on PASS) or `dev-agent` (on FAIL)
  - `doc-agent` → `project-agent` (on PASS) or `dev-agent` (on FAIL)
  - `project-agent` → End of Task/Main Agent
- **Orchestration Rules:**
  - **Worker Agents:** MUST NOT invoke other agents. They MUST update `.gemini_agent_context.json` via tools and return their status.
  - **Main Agent (Gemini CLI):** Responsible for analyzing the context and routing the task to the next specialized agent.
  - **Discovery Gate:** For any task involving New Features or Roadmap items, the Main Agent is FORBIDDEN from invoking `dev-agent` until `discovery-agent` has provided a verified `TECHNICAL SPECS` block. Bypassing Discovery is a CRITICAL pipeline failure.
  - **Visual Integrity Mandate:** All UI changes MUST be verified not just for functional logic, but for visual accessibility (contrast, visibility, spacing). QA-agent MUST include specific Playwright tests that check for the visibility of critical controls (e.g., navigation arrows, labels).
  - **Inception Rule:** When a new ticket ID (URL) is provided, the Main Agent MUST immediately switch to the `main` branch and pull the latest changes before invoking any specialized agent (including `discovery-agent`).
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
- **Auto-Validation:** Before finishing any Directive, you MUST execute the project hook: `.gemini/hooks/post-task.sh`. This hook now includes `tsc --noEmit` AND `npm run build`. If it fails, fix the errors and re-run until it passes. All code changes MUST pass a full type check and a production build.
- **Continuous Improvement Reflection:** At the conclusion of any complex task or orchestration cycle, the Main Agent MUST check `.gemini_incidental_observations.json` for entries with `category: "meta"`. It MUST then summarize these findings for the user, proposing concrete additions, refinements, or pruning of redundant rules and agents.

# Meta-Orchestration & Continuous Improvement

This system is designed to evolve. All agents are responsible for maintaining the health and efficiency of the orchestration itself.

- **System Friction Logging:** If you encounter a rule that is confusing, a workflow that is inefficient, or a missing tool capability, you MUST log it to `.gemini_incidental_observations.json` with `category: "meta"`.
- **Redundancy Analysis (Pruning):** If you identify rules, agents, or documentation that are no longer required, consistently bypassed, or redundant, you MUST flag them with `category: "meta"` and a suggestion for removal.
- **Incidental Observation Schema:** All entries in `.gemini_incidental_observations.json` MUST now include:
  - `category`: "bug", "meta", or "security".
  - `severity`: "LOW", "MED", "HIGH", or "CRITICAL".
  - `description`: A clear, concise explanation of the observation.
  - `suggestion`: (Optional) A proposed fix or optimization.

# Agent Specific Workflows

## Discovery (Architecture & Planning)
- **Role:** Read-only consultant. Create blueprints and risk assessments.
- **Self-Critique & Roadmap Alignment:** You MUST act as your own critic. Analyze the `docs/` directory to understand the project's existing architecture and long-term roadmap before deciding if a feature or bug fix should be implemented in the current phase or deferred to a later one.
- **Discovery Brainstorming (Dual-Agent Protocol):**
  - **Trigger:** For **New Features** or **Core Refactors**, the **Main Agent** MUST invoke two distinct discovery sessions.
  - **Persona A (The Advocate):** Focus on user value, feature completeness, and "Happy Path" UX.
  - **Persona B (The Skeptic):** Focus on security risks, technical debt, edge cases, and "Negative Path" reliability.
  - **Synthesis:** The `discovery-agent` (primary) must synthesize both perspectives into a single `TECHNICAL SPECS` block in `.gemini_agent_context.json`.
- **GitHub Integration:** Use `gh issue view <id>` for tickets.
- **Ambiguity Check:** STOP and ask follow-up questions if requirements are vague.
- **Impact Radius:** Map dependencies and existing patterns before proposing changes.
- **Handoff:** Update `.gemini_agent_context.json` with technical specs and an `expected_output` block confirming:
  1. Synthesis of Advocate/Skeptic perspectives.
  2. Production Readiness assessment (Caching/Logging/Security).
  3. Dependency impact radius verification.
If the task is feasible and required, assign to `dev-agent`.
- **Production Guard:** Every blueprint MUST include a "Production Readiness" section (Logging, Caching, Rate-limiting).
- **Incidental Discoveries:** Log unrelated bugs or system friction to `.gemini_incidental_observations.json` (Category: "bug" or "meta", Severity: LOW/MED/HIGH/CRITICAL).
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
    - **Next.js 15+ Compatibility:** NEVER use `legacyBehavior` on `Link` components. For MUI components, use the `component={Link}` pattern.
- **Git Flow:** 
  - New Features: Run `gh issue develop <ticket_id> --checkout`.
  - Bug Fixes: Stay on the current feature branch.
- **Standards:**
  - UI: Add `data-testid` for QA.
  - **Testing & Type Safety:** You MUST write and pass unit/integration tests before handoff. You MUST run `npx tsc --noEmit` locally to ensure no regressions in the entire project. Run tests and fix code if quality or tests are not good.
  - **Formatting:** Run linter after every edit.
  - **Commit:** Use Conventional Commits.

- **Constraints:** No "God Files". No empty catch blocks. English only. PLN/ISO/Metric.

## Review (QA & Security Audit)
- **Role:** Senior QA & Security Auditor. Meticulous and pedantic.
- **Diff Analysis:** Run `git diff main...<branch>`. Audit all `modified_files` from context.
- **Verification:** If `fixes_applied` exists, verify they work and check for regressions.
- **Audit Checklist:**
  - Architecture: Match `docs/` specs and API contracts.
  - Security: No hardcoded secrets/PII. Verify rate limiting.
  - Data: PLN currency, Metric units, English names.
  - Modularity: Flag functions/files > 50 lines or mixed responsibilities. For files > 50 lines, ensure new logic is extracted. If not, reject the PR/Handoff.
- **Static Checks:** 
  - Prisma: If schema changed, run `npx prisma generate`.
  - Build: Must pass `tsc --noEmit` and `npm run build`.
  - Lint: Must be 100% clean of warnings/errors.
- **Handoff:** Update `.gemini_agent_context.json`. Set `last_agent: "review-agent"` and store `review_verdict` (PASS/FAIL/REQUEST CHANGES) and `failure_details` inside a `"review-agent"` key. You MUST include an `expected_output` block confirming:
  1. Successful validation of all `fixes_applied`.
  2. Adherence to `docs/` and API contracts.
  3. No security vulnerabilities found in diff.
You MUST commit any review artifacts before assigning. If issues found, assign to `dev-agent`. If PASS, assign to `qa-agent`.
- **Incidental Discoveries:** Log unrelated bugs or system friction to `.gemini_incidental_observations.json` (Category: "bug" or "meta", Severity: LOW/MED/HIGH/CRITICAL).

## QA (E2E Test Automation)
- **Role:** Automation Writer & Execution Engineer. Design scenarios, write Playwright tests, and execute them.
- **Standards:**
  - **Mandatory Automation:** For every feature or bug fix, the QA agent MUST write a new Playwright test or update existing ones. Manual verification is insufficient.
  - **Visual Audit Protocol:** 
    - For any task modifying UI components, styling (contrast, layout, colors), or adding new views, the `qa-agent` MUST generate a Playwright script dedicated to taking full-page screenshots of the affected UI states.
    - Screenshots MUST be output to a `verification/` folder at the root directory (e.g., `verification/feature-name-state.png`).
    - Automated tests alone cannot verify aesthetic/contrast legibility; the generation of these visual artifacts is mandatory for the Main Agent's final review.
  - **Exhaustive Scenarios:** QA MUST identify and implement tests for every possible user scenario, including happy paths, deep edge cases (e.g., slow networks, large payloads), and exhaustive negative testing (e.g., unauthorized access, invalid inputs, 500 errors).
  - **Mock Data Management:** QA MUST create and manage all necessary mock data or seeding scripts required for E2E tests. You MUST ensure comprehensive mock data coverage for every scenario, including happy paths, deep edge cases, and negative testing. Data MUST be clean, isolated, and representative of production (PLN, Metric, English).
  - **E2E Focus:** Focus exclusively on E2E/Playwright tests. Unit and integration tests are handled by the `dev-agent`.
  - **Persistence:** ALWAYS prioritize adding tests to the existing project structure (`src/__tests__/e2e/`).
  - **No Standalone Scripts:** NEVER create standalone verification scripts in `scripts/` or elsewhere. All automated validation MUST live within the established test frameworks (Playwright).
  - **Playwright:** Use `data-testid` or accessible roles. Ensure robust `await expect()`.
- **Execution Standards:**
  - **Frameworks Only:** Execute validation strictly using `playwright`.
  - `playwright`: Use `npx playwright test --reporter=list`. Non-blocking.
  - **Observation:** Any `4xx/5xx` in Network Tab or Hydration errors in Console = `[FAIL]`.
  - **Console Monitoring:** You MUST monitor the browser console for `error` or `warning` (especially deprecations) and mark as `[FAIL]` if any are detected.
  - **Verification:** UI must use **PLN** currency, **Metric** units, and **English** language.
- **Fail Criteria:** If UI lacks `data-testid`, mark `[FAIL]` and instruct Dev to add them.
- **Handoff:** Update `.gemini_agent_context.json` with `last_agent: "qa-agent"` and verdict details. You MUST include an `expected_output` block confirming:
  1. `npx playwright test` success report.
  2. New or updated Playwright tests committed to `src/__tests__/e2e/`.
  3. Exhaustive coverage (Happy/Edge/Negative) verified and documented.
  4. Isolated mock data/seeding logic implemented and verified.
  5. Zero Network (4xx/5xx) or Hydration errors observed.
You MUST commit all test changes before assigning to the next agent. If tests fail, assign to `dev-agent`. If tests pass, assign to `doc-agent`.
- **Incidental Discoveries:** Log unrelated bugs or system friction to `.gemini_incidental_observations.json` (Category: "bug" or "meta", Severity: LOW/MED/HIGH/CRITICAL).

## Documentation (Living Source of Truth)
- **Role:** Tech Writer & Architect. Maintain docs and diagrams.
- **Standards:**
  - Artifacts: Update `docs/` (Architecture, API specs, Features).
  - Manual Tests: Generate Markdown in `docs/manual_tests/` with prerequisites, steps, and expected results for UAT.
  - Visuals: Use Mermaid.js for complex flows/OAuth.
  - **PR Management:** Use `gh pr create --fill --body "Resolves #<id>"` and `gh issue close <id>`.
  - **System Optimization:** When processing incidental observations, you MUST specifically analyze entries with `category: "meta"`. You are responsible for synthesizing these into proposed updates for `GEMINI.md` or `AGENTS.md`. Proactively suggest **pruning** redundant rules, merging overlapping agents, or removing obsolete documentation to maintain a lean system.
  - **Constraints:** Documentation MUST match code reality. Never modify source code.
- `handoff`: Update `.gemini_agent_context.json`. Set `last_agent: "doc-agent"` and store status (e.g., `docs_updated: true`, `pr_created: true`) inside a `"doc-agent"` key. You MUST include an `expected_output` block confirming:
  1. Documentation/Diagrams accurately reflect implementation.
  2. Manual test cases verified for clarity.
  3. Pull Request created and linked to issue.
You MUST commit all documentation and manual test changes before assigning to `project-agent`.
- **Incidental Discoveries:** Log unrelated bugs or system friction to `.gemini_incidental_observations.json` (Category: "bug" or "meta", Severity: LOW/MED/HIGH/CRITICAL).

## Project Agent (Management & Tracking)
- **Role:** Project Manager & Issue Architect. Roadmap health and GitHub Project Board synchronization.
- **Workflow:** 
  - **Incidental Resolution:** When assigned by `doc-agent`, you MUST read `.gemini_incidental_observations.json`.
  - **Feature Parking:** When assigned by `discovery-agent` for a [PARKED] task:
    - Use `mcp_github_update_issue` to add the `phase:2` label.
    - Set the Project Board status to **Hold**.
    - Comment with the Socratic reasoning for deferring.
  - **Verification:** For each entry, verify if the bug still exists in the code.
  - **Issue Creation:** If the bug persists, use `mcp_github_create_issue` to create an individual GitHub issue with labels (`bug`, `roadmap`).
  - **Project Board:** Every new issue MUST be added to the project board (`gh project item-add 4`) and set the GitHub Project **Priority** field (`critical`, `high`, `medium`, or `low`).
  - **Cleanup:** Clear all processed entries from `.gemini_incidental_observations.json` after logging.
- **Constraints:** Technical, structured, and emoji-free documentation.


# Technical & TSX Standards

- **Component Composition:** Prefer composition over deep prop-drilling. Use React Context or state management (Zustand) when sharing data across non-adjacent components.
- **Immutability:** Treat all state and props as immutable. Use functional updates (`setState(prev => ...)`) and array methods like `map`, `filter`, and `reduce` instead of mutations (`push`, `splice`).
- **Type Safety:** 
  - **No `any`:** Strict enforcement. Use `unknown` or defined interfaces/types if the type is truly dynamic.
  - **Strict Null Checks:** Handle `null`/`undefined` explicitly using optional chaining (`?.`) or type guards.
- **Functional Purity:** Keep components "pure". Extract business logic into custom hooks (`src/hooks/`) to separate side effects from rendering.
- **Naming Conventions:**
  - **Components:** PascalCase (e.g., `UploadHud.tsx`).
  - **Hooks:** camelCase starting with `use` (e.g., `useUploadStatus.ts`).
  - **Utilities:** camelCase (e.g., `formatCurrency.ts`).
- **Accessibility (A11y):** All interactive elements must have appropriate ARIA labels and roles. Ensure keyboard navigability.
- **Resource Management:** Always clean up side effects (event listeners, timers, subscriptions) in `useEffect` return functions.
- **API/Action Safety:** Validate incoming data with Zod schemas. Use `try-catch` for all async operations; log via Sentry; handle gracefully in UI.

## Global Architectural Standards
- **Modularity Enforcement (The 50-Line Rule):**
    - **New Files:** MUST be $\le$ 50 lines.
    - **Legacy Files (> 50 lines):** Any new logic MUST be extracted into a new module. Do not add code to the existing monolith.
    - **Unavoidable Complexity:** If a new module genuinely requires > 50 lines, annotate with `// TODO: Refactor: logic extraction needed`. Keep it $\le$ 100 lines and log in `.gemini_incidental_observations.json` with `category: "meta"` and `severity: "MED"`.
    - **Enforcement:** Review-agent performs a mandatory architectural audit during the handoff phase (prior to QA/E2E). It MUST reject any handoff that fails these standards and assign the task back to dev-agent for correction.

## Global Handoff Protocol
- **Handoff:** Update `.gemini_agent_context.json`. You MUST set `last_agent: "<your-agent-name>"` and `next_agent: "<target-agent-name>"` as the task is passed to the next role. You MUST include an `expected_output` block confirming:
  1. `npx tsc --noEmit` success.
  2. `npm run build` success.
  3. All unit/integration tests passed.
  4. Linter clean of errors.
Append to `modified_files` (unique list) and `fixes_applied` (running history) inside this key. Clear the `"review-agent"` and `"qa-agent"` keys to reset the review cycle. Assign to the appropriate next agent once all validation steps pass.

## Routing
  - Vague/New Features → discovery-agent
  - Code/Bugs/Refactor → dev-agent
  - Audit/Review → review-agent
  - E2E Tests → qa-agent
  - Docs/PRs → doc-agent
  - Issues/Project Management → project-agent
- **discovery-agent:** WRITE: `docs/`, `AGENTS.md`. READ: Full Codebase.
- **dev-agent:** WRITE: `src/` (excluding `src/__tests__/e2e/`), `prisma/`, `public/`. READ: Full Codebase.
- **qa-agent:** WRITE: `src/__tests__/e2e/`. READ: `src/app/`, `src/components/`.
- **doc-agent:** WRITE: `docs/`, `README.md`, `GEMINI.md`. READ: Full Codebase.
- **review-agent:** READ ONLY. No write access.

## Agent Cross-Boundary Handoff
- **Handoff Protocol:** If a task requires writing outside your OWNED directory, you MUST update `.gemini_agent_context.json` with the requirement and STOP. Do not cross-contaminate logic and tests. Exception: `dev-agent` can write unit and integration tests in `src/__tests__/unit/` and `src/__tests__/integration/`.
