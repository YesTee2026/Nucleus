import type { AgentProviderRunner, AgentRunRequest, AgentRunResult } from "./types.js";
import { runLocalHeuristic } from "./local-heuristic.js";
import { getTool, toolsForProvider } from "../tools/registry.js";

/**
 * Anthropic Claude provider.
 * Uses Messages API + tool use when ANTHROPIC_API_KEY is set; otherwise local heuristic.
 */
export const claudeProvider: AgentProviderRunner = {
  provider: "claude",
  async run(request: AgentRunRequest): Promise<AgentRunResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const local = await runLocalHeuristic(request);
      return {
        ...local,
        summary: `[claude:local-fallback] ${local.summary}`,
        model: "local-heuristic",
      };
    }

    const model = request.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    const tools = toolsForProvider().map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const messages: { role: string; content: unknown }[] = [
      {
        role: "user",
        content: JSON.stringify({
          task: request.kind,
          input: request.input,
          instruction:
            "Use tools to classify/stage unknown assets, propose relationships, or manage CIs. Prefer lookup_memory before staging.",
        }),
      },
    ];

    const toolTrace: AgentRunResult["toolTrace"] = [];
    let finalText = "";
    let rounds = 0;

    while (rounds < 6) {
      rounds += 1;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: request.systemPrompt,
          tools,
          messages,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Claude API error ${res.status}: ${body}`);
      }

      const data = (await res.json()) as {
        content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown>; id?: string }>;
        stop_reason?: string;
      };

      messages.push({ role: "assistant", content: data.content });

      const toolUses = data.content.filter((c) => c.type === "tool_use");
      if (toolUses.length === 0) {
        finalText = data.content
          .filter((c) => c.type === "text")
          .map((c) => c.text ?? "")
          .join("\n");
        break;
      }

      const toolResults = [];
      for (const use of toolUses) {
        const tool = getTool(use.name ?? "");
        const args = use.input ?? {};
        const result = tool
          ? await tool.execute(request.toolContext, args)
          : { error: `Unknown tool ${use.name}` };
        toolTrace.push({
          tool: use.name ?? "unknown",
          args,
          result,
          at: new Date().toISOString(),
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    return {
      provider: "claude",
      model,
      summary: finalText || "Claude agent run completed",
      output: { text: finalText, toolCalls: toolTrace.length },
      toolTrace,
    };
  },
};
