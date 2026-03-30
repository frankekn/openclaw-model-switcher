# Model Profile Switcher

OpenClaw plugin that swaps workspace bootstrap files such as `AGENTS.md` and `SOUL.md`
based on the active model.

This public repo is intentionally generic:

- no private agent examples
- no opinionated persona content
- no language-specific defaults

## How It Works

The hook listens to:

- `agent:bootstrap`
- `session:patch`

It resolves the active model to a slug such as:

- `openai-codex/gpt-5.4` -> `gpt54`
- `kimi/kimi-code` -> `kimi`
- `anthropic/claude-sonnet-*` -> `sonnet`

Then it looks for profile files in this order:

1. `profiles/<agentId>/<slug>/`
2. `profiles/_shared/<slug>/`

If a matching profile exists, the hook swaps matching bootstrap files into the
workspace and into the in-memory bootstrap payload for the current turn.

If a session switches to a model with no matching profile, the hook restores the
backed-up base workspace files.

## Directory Layout

```text
hooks/model-profile/
profiles/
  _shared/
    gpt54/
    kimi/
  my-agent/
    kimi/
      AGENTS.md
      SOUL.md
```

## Shipping Philosophy

This repo ships the mechanism, not a bundled persona.

Use `_shared/<slug>/` for model-wide behavior differences.
Use `<agentId>/<slug>/` for agent-specific overrides.

## Install

Point OpenClaw at this plugin, then optionally configure:

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
