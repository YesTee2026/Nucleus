import type { AgentProvider } from "@nucleus/shared";
import { claudeProvider } from "./claude-provider.js";
import { cursorProvider } from "./cursor-provider.js";
import type { AgentProviderRunner, AgentRunRequest, AgentRunResult } from "./types.js";

const providers: Record<AgentProvider, AgentProviderRunner> = {
  claude: claudeProvider,
  cursor: cursorProvider,
};

export function getProvider(provider: AgentProvider): AgentProviderRunner {
  return providers[provider];
}

export async function runWithProvider(request: AgentRunRequest): Promise<AgentRunResult> {
  return getProvider(request.provider).run(request);
}

export type { AgentRunRequest, AgentRunResult, ToolTraceEntry } from "./types.js";
