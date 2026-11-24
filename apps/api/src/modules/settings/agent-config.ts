import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface AgentRuntimeConfig {
  anthropicApiKey?: string;
  anthropicModel?: string;
  cursorApiKey?: string;
  cursorModel?: string;
  preferredProvider?: "claude" | "cursor" | "auto";
  useLocalFallback?: boolean;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "../../../data/agent-settings.json");

function applyEnv(cfg: AgentRuntimeConfig) {
  if (cfg.anthropicApiKey !== undefined) {
    if (cfg.anthropicApiKey) process.env.ANTHROPIC_API_KEY = cfg.anthropicApiKey;
    else delete process.env.ANTHROPIC_API_KEY;
  }
  if (cfg.anthropicModel) process.env.ANTHROPIC_MODEL = cfg.anthropicModel;
  if (cfg.cursorApiKey !== undefined) {
    if (cfg.cursorApiKey) process.env.CURSOR_API_KEY = cfg.cursorApiKey;
    else delete process.env.CURSOR_API_KEY;
  }
  if (cfg.cursorModel) process.env.CURSOR_MODEL = cfg.cursorModel;
}

export function loadAgentRuntimeConfig(): AgentRuntimeConfig {
  try {
    if (!existsSync(configPath)) return {};
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as AgentRuntimeConfig;
    applyEnv(raw);
    return raw;
  } catch {
    return {};
  }
}

export function saveAgentRuntimeConfig(patch: AgentRuntimeConfig): AgentRuntimeConfig {
  const current = loadAgentRuntimeConfig();
  const next: AgentRuntimeConfig = { ...current, ...patch };
  // Empty string means clear
  if (patch.anthropicApiKey === "") delete next.anthropicApiKey;
  if (patch.cursorApiKey === "") delete next.cursorApiKey;
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(next, null, 2), "utf8");
  applyEnv(next);
  return next;
}

export function getAgentSettingsPublic() {
  const file = loadAgentRuntimeConfig();
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? file.anthropicApiKey ?? "";
  const cursorKey = process.env.CURSOR_API_KEY ?? file.cursorApiKey ?? "";
  return {
    anthropicConfigured: Boolean(anthropicKey),
    cursorConfigured: Boolean(cursorKey),
    anthropicModel: process.env.ANTHROPIC_MODEL ?? file.anthropicModel ?? "claude-sonnet-4-5",
    cursorModel: process.env.CURSOR_MODEL ?? file.cursorModel ?? "composer-2.5",
    preferredProvider: file.preferredProvider ?? "auto",
    useLocalFallback: file.useLocalFallback ?? true,
    source: existsSync(configPath) ? "file+env" : "env",
  };
}

// Load once on module import so API restarts pick up saved keys
loadAgentRuntimeConfig();
