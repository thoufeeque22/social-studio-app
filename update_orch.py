import os
import glob

# Paths
orchestration_md = ".agents/base/ORCHESTRATION.md"
variables_md = ".agents/base/VARIABLES.md"
agent_files = glob.glob(".agents/agents/*.md")

# 1. Update ORCHESTRATION.md
with open(orchestration_md, "r") as f:
    orch_content = f.read()

# Replace Hard Stop
orch_content = orch_content.replace(
    "- **Human-in-the-Loop Workflow (HARD STOP):** ALL transitions between agent phases MUST be mediated by the user. **The Orchestrator MUST immediately HALT execution and return control to the User after writing a phase Artifact. The Orchestrator is STRICTLY FORBIDDEN from automatically chaining to the next phase or running multiple sub-agents in a single turn without explicit user approval.**",
    "- **Autonomous Flow with Strategic Checkpoints:** The Orchestrator SHOULD automatically transition between phases (Discovery -> QA -> Development -> Audit -> Documentation) when a phase completes with a SUCCESS/PASS verdict to minimize user friction."
)

orch_content = orch_content.replace(
    "2. **Artifact-First Protocol (Robust Updates):** Agents MUST write their final Artifact using `write_to_file` to `ARTIFACT_DIR` with `ArtifactMetadata.RequestFeedback: true` BEFORE terminating. This natively pauses the Orchestrator and presents a \"Proceed\" UI to the user.",
    "2. **Artifact-First Protocol (Robust Updates):** Agents MUST write their final Artifact using `write_to_file` to `ARTIFACT_DIR` BEFORE terminating. They should set `ArtifactMetadata.RequestFeedback: false` for successful completions to allow the Orchestrator to continue automatically. They MUST set `RequestFeedback: true` ONLY when the verdict is FAIL, BLOCKED, or NEEDS-INFO."
)

orch_content = orch_content.replace(
    "1. **Atomic Phases:** An agent MUST NOT proceed to the next phase autonomously. It MUST write its final Artifact with `RequestFeedback: true`, set its **Verdict**, and return control to the Orchestrator.",
    "1. **Atomic Phases:** Each agent completes a single phase. It MUST write its final Artifact (setting `RequestFeedback: false` on success or `true` on failure), set its **Verdict**, and return control to the Orchestrator for automatic transition."
)

orch_content = orch_content.replace(
    "Each phase MUST produce an Artifact in `ARTIFACT_DIR` with `RequestFeedback: true`.",
    "Each phase MUST produce an Artifact in `ARTIFACT_DIR`."
)

with open(orchestration_md, "w") as f:
    f.write(orch_content)

# 2. Update VARIABLES.md
with open(variables_md, "r") as f:
    var_content = f.read()

var_content = var_content.replace(
    "Product -> Discovery -> QA -> Development -> Review -> Audit -> Documentation -> Project",
    "Product -> Discovery -> QA -> Development -> Audit -> Documentation -> Project"
)

with open(variables_md, "w") as f:
    f.write(var_content)

# 3. Update agent definitions
for agent_file in agent_files:
    with open(agent_file, "r") as f:
        content = f.read()
    
    # Standardize RequestFeedback
    content = content.replace(
        "Set `RequestFeedback: true` in `ArtifactMetadata` to present it to the user.",
        "Set `RequestFeedback: true` in `ArtifactMetadata` ONLY if the verdict is FAIL, BLOCKED, or NEEDS-INFO. Set to `false` for SUCCESS/PASS to enable autonomous transition."
    )
    content = content.replace(
        "Set `RequestFeedback: true` in `ArtifactMetadata` to present it to the user for approval.",
        "Set `RequestFeedback: true` in `ArtifactMetadata` ONLY if the verdict is FAIL, BLOCKED, or NEEDS-INFO. Set to `false` for SUCCESS/PASS to enable autonomous transition."
    )
    content = content.replace(
        "Set `RequestFeedback: true` in `ArtifactMetadata` to present it to the user",
        "Set `RequestFeedback: true` in `ArtifactMetadata` ONLY if the verdict is FAIL, BLOCKED, or NEEDS-INFO. Set to `false` for SUCCESS/PASS to enable autonomous transition"
    )
    
    # Specific fix for Dev Agent missing E2E testing
    if "ds-dev-agent.md" in agent_file:
        content = content.replace(
            "- **Type Checking:** Run `TYPE_CHECK_CMD`",
            "- **E2E Testing:** Run the automated E2E tests written during the QA phase iteratively (Test-Driven Development).\n   - **Type Checking:** Run `TYPE_CHECK_CMD`"
        )
    
    with open(agent_file, "w") as f:
        f.write(content)

print("Updates successfully completed.")
