---
name: model-profile
description: "Swap AGENTS.md / SOUL.md variants based on the active model"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔀",
        "events": ["agent:bootstrap", "session:patch"],
        "requires": { "bins": ["node"] },
      },
  }
---

# Model Profile Switcher

Automatically swaps workspace bootstrap files such as `AGENTS.md` and `SOUL.md`
with model-specific variants.

## What It Does

- listens for `agent:bootstrap`
- listens for `session:patch` when `patch.model` changes
- resolves the active model to a profile slug
- prefers `profiles/<agentId>/<slug>/`
- falls back to `profiles/_shared/<slug>/`
- updates both in-memory bootstrap files and on-disk workspace files
- restores the base workspace files when no profile exists for the new model

## Profile Directory Layout

```text
profiles/
  _shared/
    gpt54/
    kimi/
  my-agent/
    kimi/
      AGENTS.md
      SOUL.md
```
