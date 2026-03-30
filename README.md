# OpenClaw Model Switcher

OpenClaw plugin that swaps workspace bootstrap files such as `AGENTS.md` and
`SOUL.md` based on the active model.

This repository is intentionally generic:

- no private agent examples
- no bundled persona pack
- no language-specific defaults

The goal is to publish the mechanism, not someone else's character setup.

## Features

- supports `agent:bootstrap`
- supports `session:patch`
- resolves model-specific profile slugs such as `gpt54`, `kimi`, `sonnet`
- prefers agent-specific profiles over shared profiles
- restores the original workspace files when a model has no matching profile
- updates both in-memory bootstrap files and on-disk workspace files

## Lookup Order

For a resolved model slug, the plugin looks for profile files in this order:

1. `profiles/<agentId>/<slug>/`
2. `profiles/_shared/<slug>/`

If neither exists, the plugin restores the backed-up base workspace files for
that agent workspace.

## Supported Event Flow

### `agent:bootstrap`

The hook can replace bootstrap file contents before the current turn starts.
This is what makes a model-specific `AGENTS.md` or `SOUL.md` apply on a fresh
session or on the first turn after startup.

### `session:patch`

When a privileged OpenClaw client updates the session model, the hook can switch
the workspace files for later turns in the same session.

This is useful for flows such as:

- switch from `gpt-5.4` to `kimi`
- switch from `kimi` back to `gpt-5.4`
- switch to a model without a profile and restore the base files

## Model Slugs

Current built-in slug mapping:

- `openai-codex/gpt-5.*` -> `gpt54`
- `openai/gpt-5.*` -> `gpt54`
- `kimi/kimi-code` -> `kimi`
- `kimi/kimi*` -> `kimi`
- `anthropic/claude-opus*` -> `opus`
- `anthropic/claude-sonnet*` -> `sonnet`

Any other model falls back to an auto-generated slug derived from the final path
segment of the model id.

## Repository Layout

```text
.
├── hooks/
│   └── model-profile/
│       ├── HOOK.md
│       └── handler.js
├── profiles/
│   └── _shared/
│       ├── gpt54/
│       └── kimi/
└── examples/
    └── minimal-agent/
```

## Installation

Add the plugin to OpenClaw using your preferred plugin workflow, then point
OpenClaw at this repository or at an installed copy of it.

The plugin also supports an optional config override:

```json
{
  "plugins": {
    "entries": {
      "model-profile": {
        "profilesDir": "/path/to/profiles"
      }
    }
  }
}
```

If `profilesDir` is omitted, the plugin uses its bundled `profiles/` directory.

## Quick Start

### 1. Start with your normal workspace files

Your agent workspace keeps its own base files:

- `AGENTS.md`
- `SOUL.md`

These remain the default when no model-specific profile matches.

### 2. Add a shared profile

Example:

```text
profiles/_shared/kimi/SOUL.md
```

This applies to any agent that uses the `kimi` slug, unless that agent has a
more specific override.

### 3. Add an agent-specific profile

Example:

```text
profiles/my-agent/kimi/AGENTS.md
profiles/my-agent/kimi/SOUL.md
```

This overrides the shared profile for `my-agent` only.

### 4. Switch models

When the active model changes through a supported OpenClaw flow, the plugin
updates the workspace files and logs the swap.

## What To Put In Profiles

Use profiles for model-specific behavior differences, for example:

- stricter formatting rules for a model that tends to over-format
- stronger short-answer guidance for a model that tends to ramble
- model-specific safety or verbosity constraints

Avoid using this plugin as a replacement for your main workspace identity.
Keep stable agent identity in the base workspace files and use profiles only for
model-specific adjustments.

## Shipping Philosophy

This repository does not ship a ready-made persona.

That is intentional.

Public release content should stay generic, auditable, and reusable. If you want
to publish example profiles, keep them in `examples/` and avoid private names,
private context, or highly opinionated defaults that do not generalize.

## Examples

See [examples/minimal-agent/README.md](./examples/minimal-agent/README.md) for a
small generic example layout.

## Validation

Suggested checks before release:

- import `hooks/model-profile/handler.js` with Node
- verify the hook registers `agent:bootstrap` and `session:patch`
- create a temporary session
- patch the session model across at least two slugs
- confirm the workspace files change as expected
- confirm switching to an unknown slug restores the base files

## License

MIT. See [LICENSE](./LICENSE).
