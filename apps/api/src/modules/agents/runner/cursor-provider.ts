import type { AgentProviderRunner, AgentRunRequest, AgentRunResult } from "./types.js";
import { runLocalHeuristic } from "./local-heuristic.js";
import { getTool } from "../tools/registry.js";

type CursorSdk = {
  Agent?: {
    prompt: (
      prompt: string,
      opts: { apiKey: string; model: { id: string }; cloud?: Record<string, unknown> },
    ) => Promise<{ result?: string; status?: string }>;
  };
};

async function loadCursorSdk(): Promise<CursorSdk | null> {
  try {
    // Dynamic import without a package dependency so builds succeed when SDK is absent.
    const importer = new Function("specifier", "return import(specifier)") as (
      s: string,
    ) => Promise<CursorSdk>;
    return await importer("@cursor/sdk");
  } catch {
    return null;
  }
}

/**
 * Cursor SDK / Agents API provider.
 * Uses Cursor cloud agent prompt when CURSOR_API_KEY is set; otherwise local heuristic.
 */
export const cursorProvider: AgentProviderRunner = {
  provider: "cursor",
  async run(request: AgentRunRequest): Promise<AgentRunResult> {
    const apiKey = process.env.CURSOR_API_KEY;
    if (!apiKey) {
      const local = await runLocalHeuristic(request);
      return {
        ...local,
        summary: `[cursor:local-fallback] ${local.summary}`,
        model: "local-heuristic",
      };
    }

    try {
      const sdk = await loadCursorSdk();
      if (sdk?.Agent?.prompt) {
        const model = request.model || process.env.CURSOR_MODEL || "composer-2.5";
        const prompt = [
          request.systemPrompt,
          "",
          `Agent kind: ${request.kind}`,
          `Input JSON: ${JSON.stringify(request.input)}`,
          "",
          "Return a concise JSON object with keys: summary, action, details.",
          "If the asset class/category/type is unknown, action should be stage_unknown.",
        ].join("\n");

        const result = await sdk.Agent.prompt(prompt, {
          apiKey,
          model: { id: model },
          cloud: {},
        });

        let output: Record<string, unknown> = { raw: result.result };
        try {
          const parsed = JSON.parse(String(result.result ?? "{}"));
          if (parsed && typeof parsed === "object") output = parsed as Record<string, unknown>;
        } catch {
          /* keep raw */
        }

        const toolTrace: AgentRunResult["toolTrace"] = [];
        if (
          output.action === "stage_unknown" ||
          request.kind === "discovery" ||
          request.kind === "classification"
        ) {
          const stage = getTool("stage_unknown_ci");
          if (stage) {
            const staged = await stage.execute(request.toolContext, {
              proposedName: String(output.name ?? request.input.name ?? "unknown"),
              proposedClass: output.className,
              proposedCategory: output.category,
              proposedType: output.typeHint,
              unknownReason: String(output.reason ?? "Cursor agent marked asset as unknown"),
              attributes: (output.attributes as Record<string, unknown>) ?? {},
              rawPayload: request.input,
              confidence: 0.4,
            });
            toolTrace.push({
              tool: "stage_unknown_ci",
              args: { from: "cursor" },
              result: staged,
              at: new Date().toISOString(),
            });
            output = { ...output, staged };
          }
        }

        return {
          provider: "cursor",
          model,
          summary: String(output.summary ?? result.result ?? "Cursor agent run completed"),
          output,
          toolTrace,
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const local = await runLocalHeuristic(request);
      return {
        ...local,
        summary: `[cursor:error-fallback] ${message}; ${local.summary}`,
        output: { ...local.output, cursorError: message },
      };
    }

    const local = await runLocalHeuristic(request);
    return {
      ...local,
      summary: `[cursor:unavailable-fallback] ${local.summary}`,
    };
  },
};
