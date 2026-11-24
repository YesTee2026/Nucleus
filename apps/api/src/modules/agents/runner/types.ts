import type { AgentKind, AgentProvider } from "@nucleus/shared";
import type { AgentToolContext } from "../tools/registry.js";

export interface AgentRunRequest {
  kind: AgentKind;
  provider: AgentProvider;
  model?: string;
  systemPrompt: string;
  input: Record<string, unknown>;
  toolContext: AgentToolContext;
}

export interface ToolTraceEntry {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  at: string;
}

export interface AgentRunResult {
  provider: AgentProvider;
  model: string;
  summary: string;
  output: Record<string, unknown>;
  toolTrace: ToolTraceEntry[];
}

export interface AgentProviderRunner {
  provider: AgentProvider;
  run(request: AgentRunRequest): Promise<AgentRunResult>;
}
