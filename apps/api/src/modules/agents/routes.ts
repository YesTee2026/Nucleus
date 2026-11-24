import {
  confirmStagingSchema,
  createAgentSchema,
  createMemorySchema,
  rejectStagingSchema,
  runAgentSchema,
  updateAgentScheduleSchema,
} from "@nucleus/shared";
import { and, desc, eq, lte } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { agent, agentMemory, agentRun, ciStaging } from "../../db/schema/index.js";
import { listMemory, rememberClassification } from "./memory.js";
import {
  computeNextRunAt,
  ensureDefaultAgents,
  executeAgentRun,
  listRuns,
} from "./service.js";
import { confirmStagingItem, rejectStagingItem } from "./staging.js";

export async function registerAgentRoutes(app: FastifyInstance) {
  // Static paths first (before /:id)
  app.get("/api/v1/agents/dashboard", async () => {
    const agents = await ensureDefaultAgents(db);
    const runs = await listRuns(db, undefined, 20);
    const staging = await db.select().from(ciStaging);
    const memories = await listMemory(db, 20);
    return {
      agentCount: agents.length,
      enabledAgents: agents.filter((a) => a.enabled).length,
      recentRuns: runs.slice(0, 8),
      pendingStaging: staging.filter((s) => s.status === "pending").length,
      memoryCount: memories.length,
      providers: {
        claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
        cursorConfigured: Boolean(process.env.CURSOR_API_KEY),
      },
    };
  });

  app.get("/api/v1/agents/schedules", async () => {
    const agents = await ensureDefaultAgents(db);
    return {
      schedules: agents
        .filter((a) => a.scheduleEnabled)
        .map((a) => ({
          agentId: a.id,
          name: a.name,
          kind: a.kind,
          scheduleCadence: a.scheduleCadence,
          scheduleCron: a.scheduleCron,
          scheduleTimezone: a.scheduleTimezone,
          nextRunAt: a.nextRunAt,
          lastScheduledAt: a.lastScheduledAt,
          enabled: a.enabled,
        })),
    };
  });

  app.post("/api/v1/agents/schedules/tick", async () => {
    const now = new Date();
    const due = await db
      .select()
      .from(agent)
      .where(
        and(
          eq(agent.enabled, true),
          eq(agent.scheduleEnabled, true),
          lte(agent.nextRunAt, now),
        ),
      );
    const results = [];
    for (const row of due) {
      const result = await executeAgentRun(db, row.id, {
        input: { scheduled: true, cadence: row.scheduleCadence },
      });
      await db
        .update(agent)
        .set({
          lastScheduledAt: now,
          nextRunAt: computeNextRunAt(row.scheduleCadence, now, row.scheduleCron),
          updatedAt: now,
        })
        .where(eq(agent.id, row.id));
      results.push({ agentId: row.id, runId: result.run?.id, error: result.error });
    }
    return { ran: results.length, results };
  });

  app.get("/api/v1/agents/runs", async (req) => {
    const agentId = (req.query as { agentId?: string }).agentId;
    return { runs: await listRuns(db, agentId) };
  });

  app.get<{ Params: { id: string } }>("/api/v1/agents/runs/:id", async (req, reply) => {
    const [row] = await db.select().from(agentRun).where(eq(agentRun.id, req.params.id)).limit(1);
    if (!row) return reply.status(404).send({ error: "Not found" });
    return row;
  });

  app.get("/api/v1/agents/staging", async (req) => {
    const status = (req.query as { status?: string }).status ?? "pending";
    const rows = await db
      .select()
      .from(ciStaging)
      .where(eq(ciStaging.status, status as "pending"))
      .orderBy(desc(ciStaging.createdAt));
    return { items: rows };
  });

  app.post<{ Params: { id: string } }>(
    "/api/v1/agents/staging/:id/confirm",
    async (req, reply) => {
      const body = confirmStagingSchema.parse(req.body);
      try {
        return await confirmStagingItem(db, req.params.id, body);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Confirm failed";
        return reply.status(400).send({ error: message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/agents/staging/:id/reject",
    async (req, reply) => {
      const body = rejectStagingSchema.parse(req.body);
      try {
        const item = await rejectStagingItem(db, req.params.id, body);
        return { item };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Reject failed";
        return reply.status(400).send({ error: message });
      }
    },
  );

  app.get("/api/v1/agents/memory", async () => ({ memories: await listMemory(db) }));

  app.post("/api/v1/agents/memory", async (req, reply) => {
    const body = createMemorySchema.parse(req.body);
    const row = await rememberClassification(db, {
      kind: body.kind,
      pattern: body.pattern,
      resolvedClass: body.resolvedClass,
      resolvedCategory: body.resolvedCategory,
      resolvedType: body.resolvedType,
      payload: body.payload,
      source: body.source,
    });
    return reply.status(201).send(row);
  });

  app.delete<{ Params: { id: string } }>("/api/v1/agents/memory/:id", async (req, reply) => {
    await db.delete(agentMemory).where(eq(agentMemory.id, req.params.id));
    return reply.status(204).send();
  });

  app.post("/api/v1/agents/reporting/chat", async (req, reply) => {
    const body = runAgentSchema.parse(req.body ?? {});
    const agents = await ensureDefaultAgents(db);
    const reporting = agents.find((a) => a.kind === "reporting");
    if (!reporting) return reply.status(404).send({ error: "Reporting agent not found" });
    try {
      const result = await executeAgentRun(db, reporting.id, {
        input: {
          prompt: String(body.input.prompt ?? body.input.message ?? "Executive CMDB summary"),
          ...body.input,
        },
        provider: body.provider,
        dryRun: body.dryRun,
      });
      if (result.error) return reply.status(500).send(result);
      return reply.status(200).send({
        title: (result.result?.output as { title?: string } | null)?.title,
        content: (result.result?.output as { content?: string } | null)?.content,
        run: result.run,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.get("/api/v1/agents", async () => {
    const agents = await ensureDefaultAgents(db);
    return { agents };
  });

  app.post("/api/v1/agents", async (req, reply) => {
    const body = createAgentSchema.parse(req.body);
    const [row] = await db.insert(agent).values(body).returning();
    return reply.status(201).send(row);
  });

  app.get<{ Params: { id: string } }>("/api/v1/agents/:id", async (req, reply) => {
    const [row] = await db.select().from(agent).where(eq(agent.id, req.params.id)).limit(1);
    if (!row) return reply.status(404).send({ error: "Not found" });
    return row;
  });

  app.patch<{ Params: { id: string } }>("/api/v1/agents/:id", async (req) => {
    const body = createAgentSchema.partial().parse(req.body);
    const [row] = await db
      .update(agent)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(agent.id, req.params.id))
      .returning();
    return row;
  });

  app.put<{ Params: { id: string } }>("/api/v1/agents/:id/schedule", async (req, reply) => {
    const body = updateAgentScheduleSchema.parse(req.body);
    const scheduleEnabled = body.scheduleEnabled && body.scheduleCadence !== "manual";
    const now = new Date();
    const [row] = await db
      .update(agent)
      .set({
        scheduleEnabled,
        scheduleCadence: scheduleEnabled ? body.scheduleCadence : "manual",
        scheduleCron: body.scheduleCadence === "cron" ? (body.scheduleCron ?? null) : null,
        scheduleTimezone: body.scheduleTimezone ?? "UTC",
        nextRunAt: scheduleEnabled
          ? computeNextRunAt(body.scheduleCadence, now, body.scheduleCron)
          : null,
        updatedAt: now,
      })
      .where(eq(agent.id, req.params.id))
      .returning();
    if (!row) return reply.status(404).send({ error: "Not found" });
    return row;
  });

  app.post<{ Params: { id: string } }>("/api/v1/agents/:id/run", async (req, reply) => {
    const body = runAgentSchema.parse(req.body ?? {});
    try {
      const result = await executeAgentRun(db, req.params.id, {
        input: body.input,
        provider: body.provider,
        dryRun: body.dryRun,
      });
      if (result.error) return reply.status(500).send(result);
      return reply.status(202).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Run failed";
      return reply.status(400).send({ error: message });
    }
  });
}
