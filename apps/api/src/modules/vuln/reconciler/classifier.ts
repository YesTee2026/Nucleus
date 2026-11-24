import type { NormalizedFinding, RuleEvaluationContext, RuleActions, VulnSeverity } from "@nucleus/shared";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../../db/index.js";
import { assignmentRuleLog, vulnFinding, vulnGroup, vulnTicket } from "../../../db/schema/index.js";
import { evaluateRules, loadRules } from "../rules/evaluator.js";
import type { MatchedCi } from "./ci-matcher.js";

const SEVERITY_RANK: Record<VulnSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export async function ingestFinding(
  db: Database,
  scannerConnectionId: string,
  finding: NormalizedFinding,
  matchedCi: MatchedCi | null,
): Promise<{ findingId: string; ticketId?: string }> {
  const rules = await loadRules(db);
  const now = new Date();

  const [existingGroup] = await db
    .select()
    .from(vulnGroup)
    .where(eq(vulnGroup.cveId, finding.cveId))
    .limit(1);

  let group = existingGroup;

  if (!group) {
    const [inserted] = await db
      .insert(vulnGroup)
      .values({
        cveId: finding.cveId,
        title: finding.title,
        maxSeverity: finding.severity,
        cvssScore: finding.cvssScore,
        affectedCiCount: matchedCi ? 1 : 0,
        openTicketCount: 0,
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .returning();
    group = inserted;
  } else {
    const newSeverity =
      SEVERITY_RANK[finding.severity] > SEVERITY_RANK[group.maxSeverity]
        ? finding.severity
        : group.maxSeverity;
    const [updated] = await db
      .update(vulnGroup)
      .set({
        maxSeverity: newSeverity,
        cvssScore: Math.max(group.cvssScore, finding.cvssScore),
        lastSeenAt: now,
      })
      .where(eq(vulnGroup.id, group.id))
      .returning();
    group = updated;
  }

  const [existingFinding] = await db
    .select()
    .from(vulnFinding)
    .where(
      and(
        eq(vulnFinding.scannerConnectionId, scannerConnectionId),
        eq(vulnFinding.externalId, finding.externalId),
      ),
    )
    .limit(1);

  let findingRow;
  if (existingFinding) {
    [findingRow] = await db
      .update(vulnFinding)
      .set({
        ciId: matchedCi?.id ?? existingFinding.ciId,
        vulnGroupId: group.id,
        lastSeenAt: now,
        severity: finding.severity,
        cvssScore: finding.cvssScore,
        status: "active",
      })
      .where(eq(vulnFinding.id, existingFinding.id))
      .returning();
  } else {
    [findingRow] = await db
      .insert(vulnFinding)
      .values({
        scannerConnectionId,
        externalId: finding.externalId,
        ciId: matchedCi?.id ?? null,
        vulnGroupId: group.id,
        cveId: finding.cveId,
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        cvssScore: finding.cvssScore,
        packageName: finding.packageName,
        installedVersion: finding.installedVersion,
        fixedVersion: finding.fixedVersion,
        rawPayload: finding.rawPayload,
        firstSeenAt: now,
        lastSeenAt: now,
        status: "active",
      })
      .returning();
  }

  if (!matchedCi) return { findingId: findingRow.id };

  const [existingTicket] = await db
    .select()
    .from(vulnTicket)
    .where(and(eq(vulnTicket.vulnGroupId, group.id), eq(vulnTicket.ciId, matchedCi.id)))
    .limit(1);

  if (existingTicket) {
    return { findingId: findingRow.id, ticketId: existingTicket.id };
  }

  const ruleResult = evaluateRules(rules, {
    severity: finding.severity,
    cvssScore: finding.cvssScore,
    cveId: finding.cveId,
    ci: {
      id: matchedCi.id,
      classId: matchedCi.classId,
      className: String(matchedCi.attributes.className ?? ""),
      environment: matchedCi.environment,
      attributes: matchedCi.attributes,
    },
  });

  const dueDays = ruleResult.actions.setDueDays ?? 30;
  const dueDate = new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000);
  const ticketNumber = await nextTicketNumber(db);

  const [ticket] = await db
    .insert(vulnTicket)
    .values({
      ticketNumber,
      vulnGroupId: group.id,
      ciId: matchedCi.id,
      findingId: findingRow.id,
      title: `${finding.cveId} on ${matchedCi.name}`,
      severity: finding.severity,
      status: ruleResult.actions.assignedTeam || ruleResult.actions.assigneeId ? "assigned" : "open",
      assigneeId: ruleResult.actions.assigneeId,
      assignedTeam: ruleResult.actions.assignedTeam,
      dueDate,
    })
    .returning();

  await refreshGroupCounts(db, group.id);

  if (ruleResult.ruleId) {
    await db.insert(assignmentRuleLog).values({
      ruleId: ruleResult.ruleId,
      ticketId: ticket.id,
    });
  }

  return { findingId: findingRow.id, ticketId: ticket.id };
}

async function refreshGroupCounts(db: Database, groupId: string) {
  const tickets = await db
    .select({ ciId: vulnTicket.ciId, status: vulnTicket.status })
    .from(vulnTicket)
    .where(eq(vulnTicket.vulnGroupId, groupId));

  const affectedCiCount = new Set(tickets.map((t) => t.ciId)).size;
  const openTicketCount = tickets.filter(
    (t) => !["closed", "verified", "resolved"].includes(t.status),
  ).length;

  await db
    .update(vulnGroup)
    .set({ affectedCiCount, openTicketCount })
    .where(eq(vulnGroup.id, groupId));
}

async function nextTicketNumber(db: Database): Promise<string> {
  const year = new Date().getFullYear();
  const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(vulnTicket);
  const num = (result?.count ?? 0) + 1;
  return `VUL-${year}-${String(num).padStart(5, "0")}`;
}

export type { RuleEvaluationContext, RuleActions };