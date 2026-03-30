import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED_PROFILE_ID = "_shared";

const MODEL_SLUG_MAP = [
  { match: /openai-codex\/gpt-5/, slug: "gpt54" },
  { match: /openai\/gpt-5/, slug: "gpt54" },
  { match: /kimi\/kimi-code/, slug: "kimi" },
  { match: /kimi\/kimi/, slug: "kimi" },
  { match: /anthropic\/claude-opus/, slug: "opus" },
  { match: /anthropic\/claude-sonnet/, slug: "sonnet" },
];

function resolveSlug(modelId) {
  if (!modelId) return null;
  for (const { match, slug } of MODEL_SLUG_MAP) {
    if (match.test(modelId)) return slug;
  }
  const name = modelId.split("/").pop() ?? modelId;
  return name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

function getAgentId(event) {
  const parts = (event.sessionKey ?? "").split(":");
  return parts[1] || null;
}

function getAgentCfg(cfg, agentId) {
  return cfg?.agents?.list?.find((agent) => agent.id === agentId) ?? null;
}

function getWorkspaceDir(cfg, agentId) {
  const agentCfg = getAgentCfg(cfg, agentId);
  return agentCfg?.workspace ?? cfg?.agents?.defaults?.workspace ?? null;
}

function getProfilesDir(context) {
  const pluginConfig = context?.cfg?.plugins?.entries?.["model-profile"] ?? {};
  return pluginConfig.profilesDir
    ? pluginConfig.profilesDir
    : join(__dirname, "..", "..", "profiles");
}

function getConfiguredModelId(cfg, agentId) {
  const agentModel = getAgentCfg(cfg, agentId)?.model;
  if (typeof agentModel === "string" && agentModel.trim()) return agentModel.trim();
  if (typeof agentModel?.primary === "string" && agentModel.primary.trim()) return agentModel.primary.trim();

  const defaultModel = cfg?.agents?.defaults?.model;
  if (typeof defaultModel === "string" && defaultModel.trim()) return defaultModel.trim();
  if (typeof defaultModel?.primary === "string" && defaultModel.primary.trim()) return defaultModel.primary.trim();

  return null;
}

function getSessionEntryModelId(sessionEntry) {
  if (!sessionEntry || typeof sessionEntry !== "object") return null;

  if (typeof sessionEntry.model === "string" && sessionEntry.model.trim()) {
    return sessionEntry.model.trim();
  }

  const providerOverride =
    typeof sessionEntry.providerOverride === "string" ? sessionEntry.providerOverride.trim() : "";
  const modelOverride =
    typeof sessionEntry.modelOverride === "string" ? sessionEntry.modelOverride.trim() : "";
  if (providerOverride && modelOverride) return `${providerOverride}/${modelOverride}`;

  return null;
}

function getModelId(context, agentId, preferredModel = null) {
  if (typeof preferredModel === "string" && preferredModel.trim()) return preferredModel.trim();
  return getSessionEntryModelId(context?.sessionEntry) ?? getConfiguredModelId(context?.cfg, agentId);
}

function listProfileBasenames(profileDir) {
  if (!existsSync(profileDir)) return [];
  return readdirSync(profileDir).filter((basename) => {
    if (!basename || basename.startsWith(".")) return false;
    if (basename.endsWith(".example") || basename.endsWith(".example.md")) return false;

    const fullPath = join(profileDir, basename);
    try {
      return statSync(fullPath).isFile();
    } catch {
      return false;
    }
  });
}

function findProfileDir(profilesDir, agentId, slug) {
  const candidates = [
    join(profilesDir, agentId, slug),
    join(profilesDir, SHARED_PROFILE_ID, slug),
  ];

  for (const candidate of candidates) {
    if (listProfileBasenames(candidate).length > 0) return candidate;
  }

  return null;
}

function ensureBaseBackup(workspaceDir, basenames) {
  const backupDir = join(workspaceDir, ".openclaw", "model-profile-base");
  mkdirSync(backupDir, { recursive: true });

  for (const basename of basenames) {
    const workspacePath = join(workspaceDir, basename);
    const backupPath = join(backupDir, basename);
    if (!existsSync(workspacePath) || existsSync(backupPath)) continue;
    copyFileSync(workspacePath, backupPath);
  }

  return backupDir;
}

function applyProfileToWorkspace(workspaceDir, profileDir) {
  const basenames = listProfileBasenames(profileDir);
  ensureBaseBackup(workspaceDir, basenames);

  const swapped = [];
  for (const basename of basenames) {
    const profilePath = join(profileDir, basename);
    try {
      const content = readFileSync(profilePath, "utf8");
      writeFileSync(join(workspaceDir, basename), content, "utf8");
      swapped.push(basename);
    } catch {
      // Ignore malformed or unreadable profile files.
    }
  }

  return swapped;
}

function restoreWorkspaceBase(workspaceDir) {
  const backupDir = join(workspaceDir, ".openclaw", "model-profile-base");
  if (!existsSync(backupDir)) return [];

  const restored = [];
  for (const basename of listProfileBasenames(backupDir)) {
    const backupPath = join(backupDir, basename);
    try {
      const content = readFileSync(backupPath, "utf8");
      writeFileSync(join(workspaceDir, basename), content, "utf8");
      restored.push(basename);
    } catch {
      // Ignore malformed or unreadable backup files.
    }
  }

  return restored;
}

function swapBootstrapFiles(context, profileDir) {
  const available = new Set(listProfileBasenames(profileDir));
  const swapped = [];

  context.bootstrapFiles = context.bootstrapFiles.map((file) => {
    const basename = file.name ?? file.path?.split("/").pop();
    if (!basename || !available.has(basename)) return file;

    const profilePath = join(profileDir, basename);
    try {
      const content = readFileSync(profilePath, "utf8");
      swapped.push(basename);
      return { ...file, content };
    } catch {
      return file;
    }
  });

  return swapped;
}

const handler = async (event) => {
  const { context } = event;
  const agentId = getAgentId(event);
  if (!agentId) return;

  const workspaceDir = getWorkspaceDir(context?.cfg, agentId);
  const profilesDir = getProfilesDir(context);
  let modelId = getModelId(context, agentId);

  if (event.type === "session" && event.action === "patch") {
    if (!("model" in (context?.patch ?? {}))) return;
    modelId = getModelId(context, agentId, context?.patch?.model);
  } else if (!(event.type === "agent" && event.action === "bootstrap")) {
    return;
  }

  const slug = resolveSlug(modelId);
  if (!slug) return;

  const profileDir = findProfileDir(profilesDir, agentId, slug);
  if (!profileDir) {
    if (workspaceDir && event.type === "session" && event.action === "patch") {
      const restored = restoreWorkspaceBase(workspaceDir);
      if (restored.length > 0) {
        console.log(
          `[model-profile] agent=${agentId} model=${modelId} slug=${slug} restored=[${restored.join(", ")}]`
        );
      }
    }
    return;
  }

  const diskSwapped = workspaceDir ? applyProfileToWorkspace(workspaceDir, profileDir) : [];
  const bootstrapSwapped =
    event.type === "agent" && event.action === "bootstrap" && context?.bootstrapFiles
      ? swapBootstrapFiles(context, profileDir)
      : [];

  const swapped = [...new Set([...diskSwapped, ...bootstrapSwapped])];
  if (swapped.length > 0) {
    console.log(
      `[model-profile] agent=${agentId} model=${modelId} slug=${slug} swapped=[${swapped.join(", ")}]`
    );
  }
};

export default handler;
