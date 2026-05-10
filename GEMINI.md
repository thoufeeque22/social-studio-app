# Project Architecture & Conventions

- **Next.js 15 & React 19:** Follow strict rules in `AGENTS.md`.
- **Zero-Any Policy:** Strict TypeScript enforcement.

# Agent Orchestration (Scrum Master Rules)

- **Context First:** Always check `.gemini_agent_context.json` for current state before acting.
- **Incidental Audit:** Check `.gemini_incidental_observations.json` for high-severity bugs found by other agents.
- **Ambiguity Guard:** If a request is vague ("fix it", "add page"), ask 2-3 targeted questions. DO NOT guess.
- **Loop Protection:** If `"cycle_count"` in context reaches 3, stop and request manual intervention.
- **Routing:** 
  - Vague/New Features → `discovery-agent`
  - Code/Bugs/Refactor → `dev-agent`
  - Audit/Review → `review-agent`
  - Writing Tests → `qa-write-agent`
  - Running Tests/UAT → `qa-run-agent`
  - Docs/PRs → `doc-agent`
