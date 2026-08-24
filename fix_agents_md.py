with open(".agents/AGENTS.md", "r") as f:
    content = f.read()

content = content.replace(
    "- **Phase Throttling (Human-in-the-Loop):** The Orchestrator MUST terminate its turn after calling exactly one sub-agent. NEVER chain sub-agents autonomously. ALL phase transitions (per `PHASE_ORDER` in [VARIABLES.md](base/VARIABLES.md)) MUST be approved by the user.",
    "- **Phase Flow (Autonomous Checkpoints):** The Orchestrator SHOULD autonomously chain sub-agents (Discovery -> QA -> Development -> Audit) when a phase completes successfully. It should only terminate its turn to request user approval when a phase FAILS, is BLOCKED, or requires architectural decisions."
)

with open(".agents/AGENTS.md", "w") as f:
    f.write(content)

print("AGENTS.md updated successfully.")
