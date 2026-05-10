# Project Architecture & Conventions

- **Next.js 15 & React 19:** Follow strict rules in `AGENTS.md`.
- **Zero-Any Policy:** Strict TypeScript enforcement.

# Agent Orchestration (Scrum Master Rules)

- **Context First:** Always check `.gemini_agent_context.json` for current state before acting.
- **Incidental Audit:** Check `.gemini_incidental_observations.json` for high-severity bugs found by other agents.
- **Ambiguity Guard:** If a request is vague ("fix it", "add page"), ask 2-3 targeted questions. DO NOT guess.
- **Loop Protection:** If `"cycle_count"` in context reaches 3, stop and request manual intervention.

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

## Routing
  - Vague/New Features → `discovery-agent`
  - Code/Bugs/Refactor → `dev-agent`
  - Audit/Review → `review-agent`
  - Writing Tests → `qa-write-agent`
  - Running Tests/UAT → `qa-run-agent`
  - Docs/PRs → `doc-agent`
