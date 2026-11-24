import {
  createDiscoverySourceSchema,
  createFieldAliasSchema,
  createFieldMapSchema,
} from "@nucleus/shared";
import { desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import {
  discoveryFieldMap,
  discoveryResult,
  discoverySource,
  fieldAlias,
} from "../../db/schema/index.js";
import {
  approveDiscoveryResult,
  ingestDiscoveryPayload,
  rejectDiscoveryResult,
} from "./ingest.js";

export async function registerDiscoveryRoutes(app: FastifyInstance) {
  // Sources
  app.get("/api/v1/discovery/sources", async () =>
    db.select().from(discoverySource).orderBy(desc(discoverySource.createdAt)),
  );

  app.get<{ Params: { id: string } }>("/api/v1/discovery/sources/:id", async (req, reply) => {
    const [row] = await db
      .select()
      .from(discoverySource)
      .where(eq(discoverySource.id, req.params.id))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Not found" });
    return row;
  });

  app.post("/api/v1/discovery/sources", async (req, reply) => {
    const body = createDiscoverySourceSchema.parse(req.body);
    const [row] = await db.insert(discoverySource).values(body).returning();
    return reply.status(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/v1/discovery/sources/:id", async (req) => {
    const body = createDiscoverySourceSchema.partial().parse(req.body);
    const [row] = await db
      .update(discoverySource)
      .set(body)
      .where(eq(discoverySource.id, req.params.id))
      .returning();
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/v1/discovery/sources/:id", async (req, reply) => {
    await db.delete(discoverySource).where(eq(discoverySource.id, req.params.id));
    return reply.status(204).send();
  });

  // Field maps
  app.get<{ Params: { sourceId: string } }>(
    "/api/v1/discovery/sources/:sourceId/field-maps",
    async (req) =>
      db
        .select()
        .from(discoveryFieldMap)
        .where(eq(discoveryFieldMap.discoverySourceId, req.params.sourceId)),
  );

  app.post("/api/v1/discovery/field-maps", async (req, reply) => {
    const body = createFieldMapSchema.parse(req.body);
    const rows = await db
      .insert(discoveryFieldMap)
      .values(
        body.mappings.map((m) => ({
          discoverySourceId: body.discoverySourceId,
          classId: body.classId,
          className: body.className,
          sourceField: m.sourceField,
          targetField: m.targetField,
          transform: m.transform,
          transformArg: m.transformArg,
        })),
      )
      .returning();
    return reply.status(201).send(rows);
  });

  app.delete<{ Params: { id: string } }>("/api/v1/discovery/field-maps/:id", async (req, reply) => {
    await db.delete(discoveryFieldMap).where(eq(discoveryFieldMap.id, req.params.id));
    return reply.status(204).send();
  });

  // Aliases
  app.get("/api/v1/discovery/aliases", async () => db.select().from(fieldAlias));

  app.post("/api/v1/discovery/aliases", async (req, reply) => {
    const body = createFieldAliasSchema.parse(req.body);
    const [row] = await db.insert(fieldAlias).values(body).returning();
    return reply.status(201).send(row);
  });

  app.delete<{ Params: { id: string } }>("/api/v1/discovery/aliases/:id", async (req, reply) => {
    await db.delete(fieldAlias).where(eq(fieldAlias.id, req.params.id));
    return reply.status(204).send();
  });

  // Ingest
  app.post<{ Params: { id: string } }>(
    "/api/v1/discovery/sources/:id/ingest",
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const autoApplyHighConfidence = Boolean(body.autoApplyHighConfidence);
      const jobId = typeof body.jobId === "string" ? body.jobId : undefined;
      const { autoApplyHighConfidence: _, jobId: __, ...payload } = body;

      try {
        const results = await ingestDiscoveryPayload(db, req.params.id, payload, {
          autoApplyHighConfidence,
          jobId,
        });
        return reply.status(202).send({ results });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ingest failed";
        return reply.status(400).send({ error: message });
      }
    },
  );

  // Review queue
  app.get("/api/v1/discovery/review-queue", async (req) => {
    const status = (req.query as { status?: string }).status ?? "pending";
    return db
      .select()
      .from(discoveryResult)
      .where(eq(discoveryResult.status, status as "pending"))
      .orderBy(desc(discoveryResult.createdAt));
  });

  app.post<{ Params: { id: string } }>(
    "/api/v1/discovery/review-queue/:id/approve",
    async (req, reply) => {
      try {
        await approveDiscoveryResult(db, req.params.id);
        return reply.status(200).send({ ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Approve failed";
        return reply.status(400).send({ error: message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/discovery/review-queue/:id/reject",
    async (req, reply) => {
      await rejectDiscoveryResult(db, req.params.id);
      return reply.status(200).send({ ok: true });
    },
  );

  // Dashboard stats
  app.get("/api/v1/discovery/dashboard", async () => {
    const sources = await db.select().from(discoverySource);
    const results = await db.select().from(discoveryResult);
    const pending = results.filter((r) => r.status === "pending").length;
    const merged = results.filter((r) => r.status === "merged").length;
    const created = results.filter((r) => r.status === "created").length;

    return {
      sourceCount: sources.length,
      enabledSources: sources.filter((s) => s.enabled).length,
      pendingReview: pending,
      merged,
      created,
      recentResults: results.slice(0, 10),
    };
  });
}
