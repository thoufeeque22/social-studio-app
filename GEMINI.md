# Project Architecture & Conventions

- **Next.js 15 & React 19:** Follow strict rules in `AGENTS.md`.
- **Zero-Any Policy:** Strict TypeScript enforcement.

# Agent Orchestration (Scrum Master Rules)

- **Context First:** Always check `.gemini_agent_context.json` for current state before acting.
- **Model Selection:** 
  - Use **Gemini 1.5 Pro** for complex reasoning (Discovery, Dev, Review, QA-Write).
  - Use **Gemini 1.5 Flash** (or **Gemini 3 Flash Preview**) for execution, documentation, and simple triage.
  - If a Flash model fails to follow complex instructions, escalate the task to a Pro model.
- **Incidental Audit:** Check `.gemini_incidental_observations.json` for high-severity bugs found by other agents.
- **Ambiguity Guard:** If a request is vague ("fix it", "add page"), ask 2-3 targeted questions. DO NOT guess.
- **Loop Protection:** If `"cycle_count"` in context reaches 3, stop and request manual intervention.
- **Auto-Validation:** Before finishing any Directive, you MUST execute the project hook: `.gemini/hooks/post-task.sh`. If it fails, fix the errors and re-run until it passes.

# Agent Specific Workflows

## Discovery (Architecture & Planning)
- **Role:** Read-only consultant. Create blueprints and risk assessments.
- **GitHub Integration:** Use `gh issue view <id>` for tickets.
- **Ambiguity Check:** STOP and ask follow-up questions if requirements are vague.
- **Impact Radius:** Map dependencies and existing patterns before proposing changes.
- **Handoff:** Update `.gemini_agent_context.json` with technical specs for the developer.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json` (Severity: LOW/MED/HIGH).
- **Constraints:** Never modify source code. Stick to blueprints. English only. PLN/ISO units.

## Development (Implementation)
- **Role:** Staff Engineer. Clean, modular, maintainable code.
- **Context Recovery:** Read `.gemini_agent_context.json`. Fix all `failure_details` if they exist.
- **Git Flow:** 
  - New Features: Checkout `main`, pull, then `gh issue develop <id> --checkout`.
  - Bug Fixes: Stay on the current feature branch.
- **Standards:**
  - Modularize if file > 50 lines.
  - UI: Add `data-testid` for QA.
  - Formatting: Run linter after every edit.
- **Commit:** Use Conventional Commits.
- **Handoff:** Update `.gemini_agent_context.json`. Clear old `failure_details` and `verdicts` to reset the review cycle.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.
- **Constraints:** No "God Files". No empty catch blocks. English only. PLN/ISO/Metric.

## Review (QA & Security Audit)
- **Role:** Senior QA & Security Auditor. Meticulous and pedantic.
- **Diff Analysis:** Run `git diff main...<branch>`. Audit all `modified_files` from context.
- **Verification:** If `fixes_applied` exists, verify they work and check for regressions.
- **Audit Checklist:**
  - Architecture: Match `docs/` specs and API contracts.
  - Security: No hardcoded secrets/PII.
  - Data: PLN currency, Metric units, English names.
  - Modularity: Flag functions > 50 lines or mixed responsibilities.
- **Static Checks:** 
  - Prisma: If schema changed, run `npx prisma generate`.
  - Build: Must pass `tsc --noEmit` and `npm run build`.
  - Lint: Must be 100% clean of warnings/errors.
- **Handoff:** Update `.gemini_agent_context.json` with `review_verdict` (PASS/FAIL/REQUEST CHANGES) and detailed `failure_details`.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## QA Writing (Test Automation & UAT)
- **Role:** Automation Writer. Design scenarios, write Playwright tests, and manual UAT scripts.
- **Standards:**
  - Playwright: Use `data-testid` or accessible roles. Ensure robust `await expect()`.
  - UAT Scripts: Generate Markdown in `docs/manual_tests/` with prerequisites, steps, and expected results.
  - Coverage: Must cover Happy Path, Edge Cases, and Negative Testing.
- **Fail Criteria:** If UI lacks `data-testid`, mark `[FAIL]` and instruct Dev to add them.
- **Handoff:** Update `.gemini_agent_context.json` with `last_agent: "qa-write-agent"`.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## QA Running (Execution & Validation)
- **Role:** Execution Engineer. Run tests, monitor health, validate constraints.
- **Execution Standards:**
  - Playwright: Use `npx playwright test --reporter=list`. Non-blocking.
  - Observation: Any `4xx/5xx` in Network Tab or Hydration errors in Console = `[FAIL]`.
  - Verification: UI must use **PLN** currency, **Metric** units, and **English** language.
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
- **Handoff:** Update `.gemini_agent_context.json` with `last_agent: "doc-agent"` and `docs_updated: true`.
- **Incidental Discoveries:** Log unrelated bugs to `.gemini_incidental_observations.json`.

## Routing
  - Vague/New Features → `discovery-agent`
  - Code/Bugs/Refactor → `dev-agent`
  - Audit/Review → `review-agent`
  - Writing Tests → `qa-write-agent`
  - Running Tests/UAT → `qa-run-agent`
  - Docs/PRs → `doc-agent`
