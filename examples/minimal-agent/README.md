# Minimal Example

This example shows one possible profile layout for a generic agent named
`minimal-agent`.

Nothing in this directory is loaded automatically.

Copy only the files you want into your actual `profiles/` directory.

## Layout

```text
profiles/
  _shared/
    kimi/
      SOUL.md
  minimal-agent/
    gpt54/
      AGENTS.md
    kimi/
      AGENTS.md
      SOUL.md
```

## Why This Example Exists

The public plugin repository should not ship a real persona pack.

Examples belong here so users can understand the structure without inheriting a
private voice or private project context.

## Suggested Usage

- put stable identity in the workspace base files
- put model-specific formatting or behavior in `_shared/<slug>/`
- put agent-specific adjustments in `<agentId>/<slug>/`

## Example Files In This Directory

- `profiles/_shared/kimi/SOUL.md`
- `profiles/minimal-agent/gpt54/AGENTS.md`
- `profiles/minimal-agent/kimi/AGENTS.md`
- `profiles/minimal-agent/kimi/SOUL.md`
