import type { AgentKind } from "@nucleus/shared";
import { getTool } from "../tools/registry.js";
import type { AgentRunRequest, AgentRunResult, ToolTraceEntry } from "./types.js";

async function callTool(
  request: AgentRunRequest,
  tool: string,
  args: Record<string, unknown>,
  trace: ToolTraceEntry[],
) {
  const def = getTool(tool);
  if (!def) throw new Error(`Unknown tool: ${tool}`);
  const result = await def.execute(request.toolContext, args);
  trace.push({ tool, args, result, at: new Date().toISOString() });
  return result;
}

/** Deterministic CMDB agent logic used when provider API keys are absent, and as a fallback. */
export async function runLocalHeuristic(request: AgentRunRequest): Promise<AgentRunResult> {
  const trace: ToolTraceEntry[] = [];
  const kind = request.kind as AgentKind;
  const input = request.input;

  if (kind === "discovery") {
    const sources = (await callTool(request, "list_discovery_sources", {}, trace)) as {
      sources: { id: string; name: string }[];
    };
    const raw =
      (input.raw as Record<string, unknown> | undefined) ??
      (input.asset as Record<string, unknown> | undefined) ??
      {};
    const host = String(raw.hostname ?? raw.host ?? raw.name ?? input.name ?? "unknown-host");
    const pattern = String(raw.os ?? raw.vendor ?? raw.type ?? host);
    const memory = (await callTool(
      request,
      "lookup_memory",
      { kind: "class_mapping", pattern },
      trace,
    )) as { matches: { resolvedClass?: string | null }[] };

    if (memory.matches[0]?.resolvedClass) {
      return {
        provider: request.provider,
        model: "local-heuristic",
        summary: `Mapped ${host} to ${memory.matches[0].resolvedClass} via learned memory`,
        output: {
          action: "classified",
          host,
          className: memory.matches[0].resolvedClass,
          sources: sources.sources.map((s) => s.name),
        },
        toolTrace: trace,
      };
    }

    const staged = (await callTool(
      request,
      "stage_unknown_ci",
      {
        proposedName: host,
        proposedClass: raw.class ?? null,
        proposedCategory: raw.category ?? null,
        proposedType: raw.type ?? null,
        unknownReason: "Unknown class/category/type — awaiting authorized confirmation",
        matchKeys: {
          hostname: host,
          ...(raw.ip_address ? { ip_address: raw.ip_address } : {}),
        },
        attributes: raw,
        rawPayload: raw,
        confidence: 0.25,
        discoverySourceId: input.discoverySourceId,
      },
      trace,
    )) as { stagingId?: string };

    return {
      provider: request.provider,
      model: "local-heuristic",
      summary: `Parked unknown asset ${host} in staging for confirmation`,
      output: { action: "staged", stagingId: staged.stagingId, host },
      toolTrace: trace,
    };
  }

  if (kind === "classification") {
    const pattern = String(input.pattern ?? input.typeHint ?? input.name ?? "");
    const memory = (await callTool(
      request,
      "lookup_memory",
      { pattern },
      trace,
    )) as { matches: unknown[] };
    if (memory.matches.length > 0) {
      return {
        provider: request.provider,
        model: "local-heuristic",
        summary: `Found ${memory.matches.length} memory hit(s) for “${pattern}”`,
        output: { action: "memory_hit", matches: memory.matches },
        toolTrace: trace,
      };
    }
    const staged = (await callTool(
      request,
      "stage_unknown_ci",
      {
        proposedName: String(input.name ?? pattern ?? "unknown"),
        proposedClass: input.className,
        proposedCategory: input.category,
        proposedType: input.typeHint,
        unknownReason: "Classification agent could not resolve class from memory",
        attributes: input.attributes ?? {},
        rawPayload: input,
        confidence: 0.2,
      },
      trace,
    )) as { stagingId?: string };
    return {
      provider: request.provider,
      model: "local-heuristic",
      summary: `Queued classification confirmation for “${pattern}”`,
      output: { action: "staged", stagingId: staged.stagingId },
      toolTrace: trace,
    };
  }

  if (kind === "relationship") {
    const sourceQuery = String(input.sourceQuery ?? input.sourceName ?? "");
    const targetQuery = String(input.targetQuery ?? input.targetName ?? "");
    const sourceHits = (await callTool(request, "find_cis", { query: sourceQuery }, trace)) as {
      cis: { id: string; name: string }[];
    };
    const targetHits = (await callTool(request, "find_cis", { query: targetQuery }, trace)) as {
      cis: { id: string; name: string }[];
    };
    const source = sourceHits.cis[0];
    const target = targetHits.cis[0];
    if (!source || !target) {
      return {
        provider: request.provider,
        model: "local-heuristic",
        summary: "Could not resolve both CIs for relationship proposal",
        output: { action: "unresolved", sourceHits: sourceHits.cis, targetHits: targetHits.cis },
        toolTrace: trace,
      };
    }
    const proposal = (await callTool(
      request,
      "propose_relationship",
      {
        sourceCiId: source.id,
        targetCiId: target.id,
        relationshipType: String(input.relationshipType ?? "depends_on"),
        rationale: String(input.rationale ?? "Suggested by relationship agent"),
      },
      trace,
    )) as { proposal: unknown };
    return {
      provider: request.provider,
      model: "local-heuristic",
      summary: `Proposed relationship ${source.name} → ${target.name}`,
      output: { action: "propose_relationship", proposal: proposal.proposal },
      toolTrace: trace,
    };
  }

  if (kind === "reporting") {
    const prompt = String(input.prompt ?? input.message ?? input.query ?? "Executive CMDB summary");
    const classes = (await callTool(request, "list_ci_classes", {}, trace)) as {
      classes: { name: string; ciCount?: number; displayName?: string }[];
    };
    const pending = (await callTool(request, "list_pending_staging", { limit: 20 }, trace)) as {
      items: unknown[];
    };
    const top = (classes.classes ?? [])
      .filter((c) => (c.ciCount ?? 0) > 0)
      .slice(0, 5)
      .map((c) => `• ${c.displayName ?? c.name}: ${c.ciCount}`)
      .join("\n");
    const title = /vuln|security/i.test(prompt)
      ? "Vulnerability Exposure Briefing"
      : /discover|staging/i.test(prompt)
        ? "Discovery & Onboarding Status"
        : "Executive CMDB Health Summary";
    const report = `# ${title}

## Snapshot
• CI classes available: **${classes.classes?.length ?? 0}**
• Pending staging: **${pending.items?.length ?? 0}**

### Top classes
${top || "• No class counts available"}

## Recommendations
1. Confirm staged unknowns to teach classification memory.
2. Keep discovery review queue current for management visibility.
3. Schedule weekly reporting agent runs for leadership packs.

_Ask to refine: email draft, risk-by-service, or week-over-week._`;
    return {
      provider: request.provider,
      model: "local-heuristic",
      summary: `Generated report: ${title}`,
      output: { action: "report", title, content: report, prompt },
      toolTrace: trace,
    };
  }

  // manage
  const query = String(input.query ?? input.name ?? "");
  const found = (await callTool(request, "find_cis", { query }, trace)) as {
    cis: unknown[];
  };
  const pending = (await callTool(request, "list_pending_staging", { limit: 10 }, trace)) as {
    items: unknown[];
  };
  return {
    provider: request.provider,
    model: "local-heuristic",
    summary: `Manage agent scanned CIs and staging queue for “${query || "all"}”`,
    output: {
      action: "manage_summary",
      matchedCis: found.cis,
      pendingStaging: pending.items,
    },
    toolTrace: trace,
  };
}
