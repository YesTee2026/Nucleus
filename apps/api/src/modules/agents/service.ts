import { desc, eq } from "drizzle-orm";
import type { AgentKind, AgentProvider, AgentScheduleCadence } from "@nucleus/shared";
import type { Database } from "../../db/index.js";
import { agent, agentRun } from "../../db/schema/index.js";
import { AGENT_PROMPTS, defaultAgentsSeed } from "./prompts.js";
import { runWithProvider } from "./runner/index.js";

const CADENCE_MS: Record<string, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  daily: 24 * 60 * 60_000,
  weekly: 7 * 24 * 60 * 60_000,
};

export function computeNextRunAt(
  cadence: AgentScheduleCadence | string,
  from: Date = new Date(),
  cron?: string | null,
): Date | null {
  if (cadence === "manual") return null;
  if (cadence === "cron") {
    const everyHours = cron?.match(/^\S+\s+\*\/(\d+)\s+/);
    if (everyHours) {
      const hours = Math.max(1, Number(everyHours[1]) || 1);
      return new Date(from.getTime() + hours * 60 * 60_000);
    }
    return new Date(from.getTime() + CADENCE_MS.daily);
  }
  const ms = CADENCE_MS[cadence];
  if (!ms) return null;
  return new Date(from.getTime() + ms);
}

export async function ensureDefaultAgents(db: Database) {
  const existing = await db.select().from(agent);
  if (existing.length > 0) return existing;
  const seeded = [];
  for (const seed of defaultAgentsSeed()) {
    const [row] = await db.insert(agent).values(seed).returning();
    seeded.push(row);
  }
  return seeded;
}

export async function executeAgentRun(
  db: Database,
  agentId: string,
  opts: {
    input?: Record<string, unknown>;
    provider?: AgentProvider;
    dryRun?: boolean;
  },
) {
  const [row] = await db.select().from(agent).where(eq(agent.id, agentId)).limit(1);
  if (!row) throw new Error("Agent not found");
  if (!row.enabled) throw new Error("Agent is disabled");

  const provider = opts.provider ?? row.provider;
  const [run] = await db
    .insert(agentRun)
    .values({
      agentId: row.id,
      provider,
      status: "running",
      input: opts.input ?? {},
      startedAt: new Date(),
    })
    .returning();

  try {
    const result = await runWithProvider({
      kind: row.kind as AgentKind,
      provider,
      model: row.model ?? undefined,
      systemPrompt: row.systemPrompt || AGENT_PROMPTS[row.kind as AgentKind],
      input: opts.input ?? {},
      toolContext: {
        db,
        agentId: row.id,
        runId: run.id,
        dryRun: opts.dryRun ?? false,
      },
    });

    const [updated] = await db
      .update(agentRun)
      .set({
        status: "succeeded",
        output: result.output,
        toolTrace: result.toolTrace,
        finishedAt: new Date(),
      })
      .where(eq(agentRun.id, run.id))
      .returning();

    return { run: updated, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const [updated] = await db
      .update(agentRun)
      .set({
        status: "failed",
        errorMessage: message,
        finishedAt: new Date(),
      })
      .where(eq(agentRun.id, run.id))
      .returning();
    return { run: updated, result: null, error: message };
  }
}

export async function listRuns(db: Database, agentId?: string, limit = 50) {
  if (agentId) {
    return db
      .select()
      .from(agentRun)
      .where(eq(agentRun.agentId, agentId))
      .orderBy(desc(agentRun.createdAt))
      .limit(limit);
  }
  return db.select().from(agentRun).orderBy(desc(agentRun.createdAt)).limit(limit);
}
