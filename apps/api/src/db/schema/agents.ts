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
import { configurationItem, discoverySource } from "./cmdb.js";

export const agentKindEnum = pgEnum("agent_kind", [
  "discovery",
  "manage",
  "relationship",
  "classification",
  "reporting",
]);

export const agentProviderEnum = pgEnum("agent_provider", ["claude", "cursor"]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const stagingStatusEnum = pgEnum("staging_status", [
  "pending",
  "confirmed",
  "rejected",
  "promoted",
]);

export const memoryKindEnum = pgEnum("memory_kind", [
  "class_mapping",
  "category_mapping",
  "type_mapping",
  "relationship_hint",
  "field_hint",
]);

export const agentScheduleCadenceEnum = pgEnum("agent_schedule_cadence", [
  "manual",
  "15m",
  "1h",
  "6h",
  "daily",
  "weekly",
  "cron",
]);

export const agent = pgTable(
  "agent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: agentKindEnum("kind").notNull(),
    description: text("description").default("").notNull(),
    provider: agentProviderEnum("provider").default("claude").notNull(),
    model: text("model"),
    systemPrompt: text("system_prompt"),
    enabled: boolean("enabled").default(true).notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
    scheduleEnabled: boolean("schedule_enabled").default(false).notNull(),
    scheduleCadence: agentScheduleCadenceEnum("schedule_cadence").default("manual").notNull(),
    scheduleCron: text("schedule_cron"),
    scheduleTimezone: text("schedule_timezone").default("UTC").notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastScheduledAt: timestamp("last_scheduled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("agent_name_idx").on(t.name),
    index("agent_kind_idx").on(t.kind),
    index("agent_next_run_idx").on(t.nextRunAt),
  ],
);

export const agentRun = pgTable(
  "agent_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .references(() => agent.id, { onDelete: "cascade" })
      .notNull(),
    provider: agentProviderEnum("provider").notNull(),
    status: agentRunStatusEnum("status").default("queued").notNull(),
    input: jsonb("input").$type<Record<string, unknown>>().default({}).notNull(),
    output: jsonb("output").$type<Record<string, unknown>>().default({}),
    toolTrace: jsonb("tool_trace").$type<unknown[]>().default([]),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("agent_run_agent_idx").on(t.agentId),
    index("agent_run_status_idx").on(t.status),
  ],
);

export const ciStaging = pgTable(
  "ci_staging",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentRunId: uuid("agent_run_id").references(() => agentRun.id),
    discoverySourceId: uuid("discovery_source_id").references(() => discoverySource.id),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().default({}).notNull(),
    proposedName: text("proposed_name"),
    proposedClass: text("proposed_class"),
    proposedCategory: text("proposed_category"),
    proposedType: text("proposed_type"),
    unknownReason: text("unknown_reason").notNull(),
    matchKeys: jsonb("match_keys").$type<Record<string, unknown>>().default({}),
    attributes: jsonb("attributes").$type<Record<string, unknown>>().default({}),
    confidence: doublePrecision("confidence").default(0),
    status: stagingStatusEnum("status").default("pending").notNull(),
    confirmedClass: text("confirmed_class"),
    confirmedCategory: text("confirmed_category"),
    confirmedType: text("confirmed_type"),
    confirmedBy: text("confirmed_by"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    promotedCiId: uuid("promoted_ci_id").references(() => configurationItem.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ci_staging_status_idx").on(t.status),
    index("ci_staging_run_idx").on(t.agentRunId),
  ],
);

export const agentMemory = pgTable(
  "agent_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: memoryKindEnum("kind").notNull(),
    pattern: text("pattern").notNull(),
    patternNormalized: text("pattern_normalized").notNull(),
    resolvedClass: text("resolved_class"),
    resolvedCategory: text("resolved_category"),
    resolvedType: text("resolved_type"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    confidence: doublePrecision("confidence").default(1).notNull(),
    hitCount: integer("hit_count").default(0).notNull(),
    source: text("source").default("user_confirm").notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("agent_memory_kind_pattern_idx").on(t.kind, t.patternNormalized),
    index("agent_memory_pattern_idx").on(t.patternNormalized),
  ],
);
