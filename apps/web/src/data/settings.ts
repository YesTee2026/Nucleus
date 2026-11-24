export type PreferredAgentProvider = "claude" | "cursor" | "auto";

export interface AgentProviderSettings {
  anthropicApiKey: string;
  anthropicModel: string;
  cursorApiKey: string;
  cursorModel: string;
  preferredProvider: PreferredAgentProvider;
  useLocalFallback: boolean;
}

export interface PlatformSettings {
  organizationName: string;
  defaultTimezone: string;
  apiBaseUrl: string;
  agents: AgentProviderSettings;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  organizationName: "Nucleus",
  defaultTimezone: "Australia/Sydney",
  apiBaseUrl: "http://localhost:3000",
  agents: {
    anthropicApiKey: "",
    anthropicModel: "claude-sonnet-4-5",
    cursorApiKey: "",
    cursorModel: "composer-2.5",
    preferredProvider: "auto",
    useLocalFallback: true,
  },
};

const STORAGE_KEY = "nucleus.platformSettings";

export function loadSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, agents: { ...DEFAULT_SETTINGS.agents } };
    const parsed = JSON.parse(raw) as Partial<PlatformSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      agents: { ...DEFAULT_SETTINGS.agents, ...parsed.agents },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, agents: { ...DEFAULT_SETTINGS.agents } };
  }
}

export function saveSettings(settings: PlatformSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}${"•".repeat(Math.min(12, value.length - 8))}${value.slice(-4)}`;
}

export function isSecretConfigured(value: string): boolean {
  return value.trim().length > 0;
}
