import { z } from "zod";

export const vulnSeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export const findingStatusSchema = z.enum(["active", "remediated", "false_positive"]);
export const ticketStatusSchema = z.enum([
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "verified",
  "closed",
  "exception",
  "risk_accepted",
]);
export const scannerAdapterTypeSchema = z.enum([
  "trivy",
  "openvas",
  "tenable",
  "qualys",
  "rapid7",
  "webhook",
]);
export const syncStatusSchema = z.enum(["success", "failed", "running", "never"]);

export const ruleConditionSchema = z.object({
  field: z.string(),
  op: z.enum(["eq", "neq", "in", "gte", "lte", "contains"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const ruleActionsSchema = z.object({
  assigneeId: z.string().uuid().optional(),
  assignedTeam: z.string().optional(),
  setDueDays: z.number().int().positive().optional(),
});

export const normalizedFindingSchema = z.object({
  externalId: z.string(),
  cveId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  severity: vulnSeveritySchema,
  cvssScore: z.number().min(0).max(10),
  assetHostname: z.string().optional(),
  assetIp: z.string().optional(),
  assetName: z.string().optional(),
  packageName: z.string().optional(),
  installedVersion: z.string().optional(),
  fixedVersion: z.string().optional(),
  rawPayload: z.record(z.unknown()).optional(),
});

export const createScannerSchema = z.object({
  name: z.string().min(1),
  adapterType: scannerAdapterTypeSchema,
  config: z.record(z.string()),
  credentialProfileId: z.string().uuid().optional(),
  enabled: z.boolean().default(true),
});

export const createAssignmentRuleSchema = z.object({
  name: z.string().min(1),
  priority: z.number().int().min(1),
  enabled: z.boolean().default(true),
  conditions: z.array(ruleConditionSchema).min(1),
  actions: ruleActionsSchema,
});

export const updateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
  resolutionNotes: z.string().optional(),
});

export type VulnSeverity = z.infer<typeof vulnSeveritySchema>;
export type FindingStatus = z.infer<typeof findingStatusSchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type ScannerAdapterType = z.infer<typeof scannerAdapterTypeSchema>;
export type NormalizedFinding = z.infer<typeof normalizedFindingSchema>;
export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleActions = z.infer<typeof ruleActionsSchema>;

export interface RuleEvaluationContext {
  severity: VulnSeverity;
  cvssScore: number;
  cveId: string;
  ci?: {
    id: string;
    classId: string;
    className: string;
    environment: string;
    attributes: Record<string, unknown>;
  };
}
