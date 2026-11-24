import type { Database } from "../../../db/index.js";
import {
  agentMemory,
  ciClass,
  ciStaging,
  configurationItem,
  discoverySource,
} from "../../../db/schema/index.js";
import { and, desc, eq, sql } from "drizzle-orm";

export interface AgentToolContext {
  db: Database;
  agentId: string;
  runId: string;
  dryRun: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (ctx: AgentToolContext, args: Record<string, unknown>) => Promise<unknown>;
}

function normalizePattern(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export const agentTools: AgentTool[] = [
  {
    name: "lookup_memory",
    description: "Look up learned class/category/type mappings from Postgres agent memory",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string" },
        pattern: { type: "string" },
      },
      required: ["pattern"],
    },
    async execute(ctx, args) {
      const pattern = normalizePattern(String(args.pattern ?? ""));
      const kind = args.kind ? String(args.kind) : undefined;
      const rows = await ctx.db
        .select()
        .from(agentMemory)
        .where(
          kind
            ? and(eq(agentMemory.patternNormalized, pattern), eq(agentMemory.kind, kind as never))
            : eq(agentMemory.patternNormalized, pattern),
        )
        .limit(5);
      if (rows[0]) {
        await ctx.db
          .update(agentMemory)
          .set({
            hitCount: sql`${agentMemory.hitCount} + 1`,
            lastUsedAt: new Date(),
          })
          .where(eq(agentMemory.id, rows[0].id));
      }
      return { matches: rows };
    },
  },
  {
    name: "list_ci_classes",
    description: "List known CMDB CI classes",
    parameters: { type: "object", properties: {} },
    async execute(ctx) {
      return { classes: await ctx.db.select().from(ciClass) };
    },
  },
  {
    name: "find_cis",
    description: "Find configuration items by name substring",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    async execute(ctx, args) {
      const q = String(args.query ?? "").toLowerCase();
      const cis = await ctx.db.select().from(configurationItem);
      return {
        cis: cis
          .filter((c) => c.name.toLowerCase().includes(q))
          .slice(0, 25)
          .map((c) => ({
            id: c.id,
            name: c.name,
            classId: c.classId,
            environment: c.environment,
            attributes: c.attributes,
          })),
      };
    },
  },
  {
    name: "list_discovery_sources",
    description: "List configured discovery sources",
    parameters: { type: "object", properties: {} },
    async execute(ctx) {
      return { sources: await ctx.db.select().from(discoverySource) };
    },
  },
  {
    name: "stage_unknown_ci",
    description:
      "Park an unknown asset in the CI staging table until an authorized user confirms class/category/type",
    parameters: {
      type: "object",
      properties: {
        proposedName: { type: "string" },
        proposedClass: { type: "string" },
        proposedCategory: { type: "string" },
        proposedType: { type: "string" },
        unknownReason: { type: "string" },
        matchKeys: { type: "object" },
        attributes: { type: "object" },
        rawPayload: { type: "object" },
        confidence: { type: "number" },
        discoverySourceId: { type: "string" },
      },
      required: ["unknownReason"],
    },
    async execute(ctx, args) {
      if (ctx.dryRun) {
        return { dryRun: true, staged: false, preview: args };
      }
      const [row] = await ctx.db
        .insert(ciStaging)
        .values({
          agentRunId: ctx.runId,
          discoverySourceId:
            typeof args.discoverySourceId === "string" ? args.discoverySourceId : undefined,
          rawPayload: (args.rawPayload as Record<string, unknown>) ?? {},
          proposedName: args.proposedName ? String(args.proposedName) : undefined,
          proposedClass: args.proposedClass ? String(args.proposedClass) : undefined,
          proposedCategory: args.proposedCategory ? String(args.proposedCategory) : undefined,
          proposedType: args.proposedType ? String(args.proposedType) : undefined,
          unknownReason: String(args.unknownReason),
          matchKeys: (args.matchKeys as Record<string, unknown>) ?? {},
          attributes: (args.attributes as Record<string, unknown>) ?? {},
          confidence: typeof args.confidence === "number" ? args.confidence : 0.3,
          status: "pending",
        })
        .returning();
      return { staged: true, stagingId: row.id, status: row.status };
    },
  },
  {
    name: "propose_relationship",
    description: "Propose a relationship between two CIs (does not write unless dryRun=false and confirmed later)",
    parameters: {
      type: "object",
      properties: {
        sourceCiId: { type: "string" },
        targetCiId: { type: "string" },
        relationshipType: { type: "string" },
        rationale: { type: "string" },
      },
      required: ["sourceCiId", "targetCiId", "relationshipType"],
    },
    async execute(_ctx, args) {
      return {
        proposal: {
          sourceCiId: String(args.sourceCiId),
          targetCiId: String(args.targetCiId),
          relationshipType: String(args.relationshipType),
          rationale: args.rationale ? String(args.rationale) : undefined,
        },
      };
    },
  },
  {
    name: "list_pending_staging",
    description: "List pending staged CIs awaiting human confirmation",
    parameters: { type: "object", properties: { limit: { type: "number" } } },
    async execute(ctx, args) {
      const limit = typeof args.limit === "number" ? args.limit : 20;
      const rows = await ctx.db
        .select()
        .from(ciStaging)
        .where(eq(ciStaging.status, "pending"))
        .orderBy(desc(ciStaging.createdAt))
        .limit(limit);
      return { items: rows };
    },
  },
];

export function getTool(name: string): AgentTool | undefined {
  return agentTools.find((t) => t.name === name);
}

export function toolsForProvider() {
  return agentTools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
