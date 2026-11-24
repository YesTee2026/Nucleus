import {
  createAssignmentRuleSchema,
  createScannerSchema,
  updateTicketStatusSchema,
} from "@nucleus/shared";
import { asc, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import {
  assignmentRule,
  scannerConnection,
  vulnFinding,
  vulnGroup,
  vulnTicket,
} from "../../db/schema/index.js";
import { getAdapter, listAdapters } from "./adapters/index.js";
import { evaluateRuleConditions } from "./rules/evaluator.js";
import { ingestWebhookPayload, syncScannerConnection } from "./sync/sync-service.js";

export async function registerVulnRoutes(app: FastifyInstance) {
  app.get("/api/v1/vuln/adapters", async () => ({ adapters: listAdapters() }));

  app.get("/api/v1/vuln/dashboard", async () => {
    const tickets = await db.select().from(vulnTicket);
    const open = tickets.filter((t) => !["closed", "verified"].includes(t.status));
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const t of open) bySeverity[t.severity]++;

    const now = new Date();
    const slaAtRisk = open.filter((t) => {
      if (!t.dueDate) return false;
      const days = (t.dueDate.getTime() - now.getTime()) / (86400000);
      return days <= 3 && days >= 0;
    }).length;
    const slaBreached = open.filter((t) => t.slaBreachAt || (t.dueDate && t.dueDate < now)).length;

    const topCves = await db
      .select()
      .from(vulnGroup)
      .orderBy(desc(vulnGroup.affectedCiCount))
      .limit(5);

    const scanners = await db.select().from(scannerConnection).where(eq(scannerConnection.enabled, true));

    return {
      openTickets: open.length,
      bySeverity,
      slaAtRisk,
      slaBreached,
      activeFindings: (await db.select().from(vulnFinding)).filter((f) => f.status === "active").length,
      topCves,
      lastScannerSync: scanners.map((s) => ({
        name: s.name,
        status: s.lastSyncStatus,
        at: s.lastSyncAt,
      })),
    };
  });

  // Scanners
  app.get("/api/v1/vuln/scanners", async () => db.select().from(scannerConnection));

  app.post("/api/v1/vuln/scanners", async (req, reply) => {
    const body = createScannerSchema.parse(req.body);
    const [row] = await db.insert(scannerConnection).values(body).returning();
    return reply.status(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/v1/vuln/scanners/:id", async (req) => {
    const body = createScannerSchema.partial().parse(req.body);
    const [row] = await db
      .update(scannerConnection)
      .set(body)
      .where(eq(scannerConnection.id, req.params.id))
      .returning();
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/v1/vuln/scanners/:id", async (req, reply) => {
    await db.delete(scannerConnection).where(eq(scannerConnection.id, req.params.id));
    return reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/v1/vuln/scanners/:id/test", async (req) => {
    const [connection] = await db
      .select()
      .from(scannerConnection)
      .where(eq(scannerConnection.id, req.params.id))
      .limit(1);
    if (!connection) return { ok: false, message: "Not found" };
    const adapter = getAdapter(connection.adapterType);
    if (!adapter) return { ok: false, message: "Unknown adapter" };
    return adapter.testConnection(connection.config);
  });

  app.post<{ Params: { id: string } }>("/api/v1/vuln/scanners/:id/sync", async (req) => {
    const count = await syncScannerConnection(db, req.params.id);
    return { processed: count };
  });

  app.post<{ Params: { connectionId: string } }>(
    "/api/v1/vuln/webhook/:connectionId",
    async (req) => {
      const count = await ingestWebhookPayload(db, req.params.connectionId, req.body);
      return { processed: count };
    },
  );

  // Findings
  app.get("/api/v1/vuln/findings", async (req) => {
    const q = req.query as Record<string, string>;
    let query = db.select().from(vulnFinding);
    const rows = await query;
    return rows.filter((f) => {
      if (q.ciId && f.ciId !== q.ciId) return false;
      if (q.cveId && f.cveId !== q.cveId) return false;
      if (q.severity && f.severity !== q.severity) return false;
      if (q.status && f.status !== q.status) return false;
      return true;
    });
  });

  // Groups
  app.get("/api/v1/vuln/groups", async () =>
    db.select().from(vulnGroup).orderBy(desc(vulnGroup.affectedCiCount)),
  );

  app.get<{ Params: { cveId: string } }>("/api/v1/vuln/groups/:cveId", async (req) => {
    const [group] = await db
      .select()
      .from(vulnGroup)
      .where(eq(vulnGroup.cveId, req.params.cveId))
      .limit(1);
    if (!group) return null;
    const findings = await db.select().from(vulnFinding).where(eq(vulnFinding.cveId, req.params.cveId));
    const tickets = await db.select().from(vulnTicket).where(eq(vulnTicket.vulnGroupId, group.id));
    return { group, findings, tickets };
  });

  // Tickets
  app.get("/api/v1/vuln/tickets", async () =>
    db.select().from(vulnTicket).orderBy(desc(vulnTicket.createdAt)),
  );

  app.get<{ Params: { id: string } }>("/api/v1/vuln/tickets/:id", async (req) => {
    const [ticket] = await db
      .select()
      .from(vulnTicket)
      .where(eq(vulnTicket.id, req.params.id))
      .limit(1);
    return ticket ?? null;
  });

  app.patch<{ Params: { id: string } }>("/api/v1/vuln/tickets/:id/status", async (req) => {
    const body = updateTicketStatusSchema.parse(req.body);
    const [row] = await db
      .update(vulnTicket)
      .set({
        status: body.status,
        resolutionNotes: body.resolutionNotes,
        updatedAt: new Date(),
      })
      .where(eq(vulnTicket.id, req.params.id))
      .returning();
    return row;
  });

  app.patch<{ Params: { id: string } }>("/api/v1/vuln/tickets/:id/assign", async (req) => {
    const body = req.body as { assigneeId?: string; assignedTeam?: string };
    const [row] = await db
      .update(vulnTicket)
      .set({
        assigneeId: body.assigneeId,
        assignedTeam: body.assignedTeam,
        status: "assigned",
        updatedAt: new Date(),
      })
      .where(eq(vulnTicket.id, req.params.id))
      .returning();
    return row;
  });

  // CI context
  app.get<{ Params: { ciId: string } }>("/api/v1/vuln/cis/:ciId/vulnerabilities", async (req) => {
    const findings = await db
      .select()
      .from(vulnFinding)
      .where(eq(vulnFinding.ciId, req.params.ciId));
    const tickets = await db
      .select()
      .from(vulnTicket)
      .where(eq(vulnTicket.ciId, req.params.ciId));
    return { findings, tickets };
  });

  // Assignment rules
  app.get("/api/v1/vuln/assignment-rules", async () =>
    db.select().from(assignmentRule).orderBy(asc(assignmentRule.priority)),
  );

  app.post("/api/v1/vuln/assignment-rules", async (req, reply) => {
    const body = createAssignmentRuleSchema.parse(req.body);
    const [row] = await db
      .insert(assignmentRule)
      .values({ ...body, createdBy: "admin" })
      .returning();
    return reply.status(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/v1/vuln/assignment-rules/:id", async (req) => {
    const body = createAssignmentRuleSchema.partial().parse(req.body);
    const [row] = await db
      .update(assignmentRule)
      .set(body)
      .where(eq(assignmentRule.id, req.params.id))
      .returning();
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/v1/vuln/assignment-rules/:id", async (req, reply) => {
    await db.delete(assignmentRule).where(eq(assignmentRule.id, req.params.id));
    return reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/v1/vuln/assignment-rules/:id/test", async (req) => {
    const [rule] = await db
      .select()
      .from(assignmentRule)
      .where(eq(assignmentRule.id, req.params.id))
      .limit(1);
    if (!rule) return { matched: false };
    const context = req.body as Parameters<typeof evaluateRuleConditions>[1];
    const matched = evaluateRuleConditions(rule.conditions as never[], context);
    return { matched, actions: matched ? rule.actions : null };
  });
}
