import {
  boolean,
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

export const ciClass = pgTable(
  "ci_class",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    parentClassId: uuid("parent_class_id"),
    isAbstract: boolean("is_abstract").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("ci_class_name_idx").on(t.name)],
);

export const ciFieldDefinition = pgTable(
  "ci_field_definition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .references(() => ciClass.id)
      .notNull(),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    dataType: text("data_type").notNull(),
    isRequired: boolean("is_required").default(false).notNull(),
    isStandard: boolean("is_standard").default(false).notNull(),
    isDiscoveryKey: boolean("is_discovery_key").default(false).notNull(),
    validationRules: jsonb("validation_rules").$type<Record<string, unknown>>().default({}),
    displayOrder: integer("display_order").default(0).notNull(),
  },
  (t) => [uniqueIndex("ci_field_class_name_idx").on(t.classId, t.name)],
);

export const configurationItem = pgTable(
  "configuration_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .references(() => ciClass.id)
      .notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    environment: text("environment").notNull().default("production"),
    parentCiId: uuid("parent_ci_id"),
    attributes: jsonb("attributes").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ci_name_idx").on(t.name),
    index("ci_class_idx").on(t.classId),
    index("ci_environment_idx").on(t.environment),
  ],
);

export const discoverySourceTypeEnum = pgEnum("discovery_source_type", [
  "network_scan",
  "script",
  "webhook",
]);

export const discoveryResultStatusEnum = pgEnum("discovery_result_status", [
  "pending",
  "merged",
  "created",
  "rejected",
]);

export const discoveryConfidenceEnum = pgEnum("discovery_confidence", [
  "high",
  "medium",
  "low",
]);

export const discoverySource = pgTable("discovery_source", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: discoverySourceTypeEnum("type").notNull(),
  classId: uuid("class_id").references(() => ciClass.id),
  className: text("class_name"),
  config: jsonb("config").$type<Record<string, string>>().default({}).notNull(),
  credentialProfileId: uuid("credential_profile_id"),
  enabled: boolean("enabled").default(true).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: text("last_run_status").default("never"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const discoveryFieldMap = pgTable(
  "discovery_field_map",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discoverySourceId: uuid("discovery_source_id")
      .references(() => discoverySource.id, { onDelete: "cascade" })
      .notNull(),
    classId: uuid("class_id").references(() => ciClass.id),
    className: text("class_name"),
    sourceField: text("source_field").notNull(),
    targetField: text("target_field").notNull(),
    transform: text("transform").default("none").notNull(),
    transformArg: text("transform_arg"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("field_map_source_target_idx").on(
      t.discoverySourceId,
      t.sourceField,
      t.targetField,
    ),
  ],
);

export const fieldAlias = pgTable(
  "field_alias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alias: text("alias").notNull(),
    targetField: text("target_field").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("field_alias_idx").on(t.alias)],
);

export const discoveryResult = pgTable(
  "discovery_result",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discoverySourceId: uuid("discovery_source_id")
      .references(() => discoverySource.id)
      .notNull(),
    jobId: uuid("job_id"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    normalizedCi: jsonb("normalized_ci").$type<Record<string, unknown>>(),
    matchCiId: uuid("match_ci_id").references(() => configurationItem.id),
    confidence: discoveryConfidenceEnum("confidence").notNull(),
    status: discoveryResultStatusEnum("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("discovery_result_status_idx").on(t.status),
    index("discovery_result_source_idx").on(t.discoverySourceId),
  ],
);
