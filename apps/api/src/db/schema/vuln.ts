import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { configurationItem } from "./cmdb.js";

export const vulnSeverityEnum = pgEnum("vuln_severity", [
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export const findingStatusEnum = pgEnum("finding_status", [
  "active",
  "remediated",
  "false_positive",
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "verified",
  "closed",
  "exception",
  "risk_accepted",
]);
export const scannerAdapterEnum = pgEnum("scanner_adapter", [
  "trivy",
  "openvas",
  "tenable",
  "qualys",
  "rapid7",
  "webhook",
]);
export const syncStatusEnum = pgEnum("sync_status", ["success", "failed", "running", "never"]);

export const scannerConnection = pgTable("scanner_connection", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  adapterType: scannerAdapterEnum("adapter_type").notNull(),
  config: jsonb("config").$type<Record<string, string>>().default({}).notNull(),
  credentialProfileId: uuid("credential_profile_id"),
  enabled: boolean("enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: syncStatusEnum("last_sync_status").default("never").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vulnGroup = pgTable(
  "vuln_group",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cveId: text("cve_id").notNull(),
    title: text("title").notNull(),
    maxSeverity: vulnSeverityEnum("max_severity").notNull(),
    cvssScore: doublePrecision("cvss_score").notNull(),
    affectedCiCount: integer("affected_ci_count").default(0).notNull(),
    openTicketCount: integer("open_ticket_count").default(0).notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("vuln_group_cve_idx").on(t.cveId)],
);

export const vulnFinding = pgTable(
  "vuln_finding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scannerConnectionId: uuid("scanner_connection_id")
      .references(() => scannerConnection.id)
      .notNull(),
    externalId: text("external_id").notNull(),
    ciId: uuid("ci_id").references(() => configurationItem.id),
    vulnGroupId: uuid("vuln_group_id").references(() => vulnGroup.id),
    cveId: text("cve_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    severity: vulnSeverityEnum("severity").notNull(),
    cvssScore: doublePrecision("cvss_score").notNull(),
    packageName: text("package_name"),
    installedVersion: text("installed_version"),
    fixedVersion: text("fixed_version"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    status: findingStatusEnum("status").default("active").notNull(),
  },
  (t) => [
    index("finding_ci_idx").on(t.ciId),
    index("finding_cve_idx").on(t.cveId),
    index("finding_severity_status_idx").on(t.severity, t.status),
    uniqueIndex("finding_scanner_external_idx").on(t.scannerConnectionId, t.externalId),
  ],
);

export const vulnTicket = pgTable(
  "vuln_ticket",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketNumber: text("ticket_number").notNull(),
    vulnGroupId: uuid("vuln_group_id")
      .references(() => vulnGroup.id)
      .notNull(),
    ciId: uuid("ci_id")
      .references(() => configurationItem.id)
      .notNull(),
    findingId: uuid("finding_id").references(() => vulnFinding.id),
    title: text("title").notNull(),
    severity: vulnSeverityEnum("severity").notNull(),
    status: ticketStatusEnum("status").default("open").notNull(),
    assigneeId: uuid("assignee_id"),
    assignedTeam: text("assigned_team"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    slaBreachAt: timestamp("sla_breach_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ticket_number_idx").on(t.ticketNumber),
    uniqueIndex("ticket_group_ci_idx").on(t.vulnGroupId, t.ciId),
    index("ticket_assignee_status_idx").on(t.assigneeId, t.status),
  ],
);

export const assignmentRule = pgTable("assignment_rule", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  priority: integer("priority").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  conditions: jsonb("conditions").$type<Array<{ field: string; op: string; value: unknown }>>().notNull(),
  actions: jsonb("actions").$type<Record<string, unknown>>().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assignmentRuleLog = pgTable("assignment_rule_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id")
    .references(() => assignmentRule.id)
    .notNull(),
  ticketId: uuid("ticket_id")
    .references(() => vulnTicket.id)
    .notNull(),
  matchedAt: timestamp("matched_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditEvent = pgTable("audit_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
