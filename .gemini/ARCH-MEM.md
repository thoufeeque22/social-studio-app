# Elite Architecture Memory

- **Rules:** Centralized in `GEMINI.md`. All agents MUST follow.
- **Sub-agents:** Located in `.gemini/agents/`.
  - `scrum-master`: Triage & Routing.
  - `discovery-agent`: Technical Blueprints.
  - `dev-agent`: Implementation.
  - `review-agent`: Audit & Verification.
  - `qa-agent`: Test Writing & Execution.
  - `doc-agent`: PRs & living docs.
- **Hooks:** `.gemini/hooks/post-task.sh` (auto-lint/test).
- **State:** `.gemini_agent_context.json` (transient workflow state).
