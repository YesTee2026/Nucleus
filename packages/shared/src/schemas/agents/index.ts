import { z } from "zod";

export const agentKindSchema = z.enum([
  "discovery",
  "manage",
  "relationship",
  "classification",
  "reporting",
]);

export const agentProviderSchema = z.enum(["claude", "cursor"]);

export const agentRunStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const stagingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "rejected",
  "promoted",
]);

export const memoryKindSchema = z.enum([
  "class_mapping",
  "category_mapping",
  "type_mapping",
  "relationship_hint",
  "field_hint",
]);

export const agentScheduleCadenceSchema = z.enum([
  "manual",
  "15m",
  "1h",
  "6h",
  "daily",
  "weekly",
  "cron",
]);

export const createAgentSchema = z.object({
  name: z.string().min(1),
  kind: agentKindSchema,
  description: z.string().default(""),
  provider: agentProviderSchema.default("claude"),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
  scheduleEnabled: z.boolean().default(false),
  scheduleCadence: agentScheduleCadenceSchema.default("manual"),
  scheduleCron: z.string().nullable().optional(),
  scheduleTimezone: z.string().default("UTC"),
});

export const updateAgentScheduleSchema = z.object({
  scheduleEnabled: z.boolean(),
  scheduleCadence: agentScheduleCadenceSchema,
  scheduleCron: z.string().nullable().optional(),
  scheduleTimezone: z.string().optional(),
});

export const runAgentSchema = z.object({
  input: z.record(z.unknown()).default({}),
  provider: agentProviderSchema.optional(),
  dryRun: z.boolean().default(false),
});

export const confirmStagingSchema = z.object({
  className: z.string().min(1),
  category: z.string().optional(),
  typeHint: z.string().optional(),
  displayName: z.string().optional(),
  attributes: z.record(z.unknown()).default({}),
  remember: z.boolean().default(true),
  confirmedBy: z.string().min(1),
  notes: z.string().optional(),
});

export const rejectStagingSchema = z.object({
  reason: z.string().optional(),
  rejectedBy: z.string().min(1),
});

export const createMemorySchema = z.object({
  kind: memoryKindSchema,
  pattern: z.string().min(1),
  resolvedClass: z.string().optional(),
  resolvedCategory: z.string().optional(),
  resolvedType: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
  confidence: z.number().min(0).max(1).default(1),
  source: z.string().default("user_confirm"),
});

export const updateAgentSettingsSchema = z.object({
  anthropicApiKey: z.string().optional(),
  anthropicModel: z.string().optional(),
  cursorApiKey: z.string().optional(),
  cursorModel: z.string().optional(),
  preferredProvider: z.enum(["claude", "cursor", "auto"]).optional(),
  useLocalFallback: z.boolean().optional(),
});

export type AgentKind = z.infer<typeof agentKindSchema>;
export type AgentProvider = z.infer<typeof agentProviderSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type StagingStatus = z.infer<typeof stagingStatusSchema>;
export type MemoryKind = z.infer<typeof memoryKindSchema>;
export type AgentScheduleCadence = z.infer<typeof agentScheduleCadenceSchema>;
export type UpdateAgentSettings = z.infer<typeof updateAgentSettingsSchema>;
