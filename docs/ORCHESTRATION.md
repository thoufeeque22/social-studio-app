# Persistent Autonomous Orchestration

## Overview
This system enables continuous, multi-session autonomous task execution. The agent chain persists its state in `.gemini_agent_context.json`, allowing any session to resume the pipeline exactly where it left off.

## State Machine
The `.gemini_agent_context.json` file serves as the definitive source of truth. Every agent is responsible for:
1. Reading its input state from the context.
2. Executing its assigned directive.
3. Updating the context with its findings and results.
4. Setting the `last_agent` to the next agent in the sequence.

## Lifecycle
- **Trigger:** `/autostart <ticket_id>` initializes the context.
- **Persistence:** The context is maintained in the root directory.
- **Auto-Resume:** Upon starting a new session, the agent *must* inspect `.gemini_agent_context.json`. If an active pipeline is found, it automatically resumes.
- **Hooks:** `.gemini/hooks/post-task.sh` is executed between agent handoffs to ensure environment consistency.

## Agent Sequence
`discovery-agent` → `dev-agent` → `review-agent` → `qa-agent` → `doc-agent` → `project-agent`
