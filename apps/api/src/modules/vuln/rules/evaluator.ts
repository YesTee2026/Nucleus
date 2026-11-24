import type { RuleActions, RuleCondition, RuleEvaluationContext } from "@nucleus/shared";
import { asc, eq } from "drizzle-orm";
import type { Database } from "../../../db/index.js";
import { assignmentRule } from "../../../db/schema/index.js";

export interface StoredRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleActions;
}

export interface RuleEvaluationResult {
  actions: RuleActions;
  ruleId?: string;
}

export async function loadRules(db: Database): Promise<StoredRule[]> {
  const rows = await db
    .select()
    .from(assignmentRule)
    .where(eq(assignmentRule.enabled, true))
    .orderBy(asc(assignmentRule.priority));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    priority: r.priority,
    enabled: r.enabled,
    conditions: r.conditions as RuleCondition[],
    actions: r.actions as RuleActions,
  }));
}

export function evaluateRules(
  rules: StoredRule[],
  context: RuleEvaluationContext,
): RuleEvaluationResult {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (matchesAllConditions(rule.conditions, context)) {
      return { actions: rule.actions, ruleId: rule.id };
    }
  }
  return { actions: {} };
}

export function evaluateRuleConditions(
  conditions: RuleCondition[],
  context: RuleEvaluationContext,
): boolean {
  return matchesAllConditions(conditions, context);
}

function matchesAllConditions(conditions: RuleCondition[], context: RuleEvaluationContext): boolean {
  return conditions.every((c) => matchesCondition(c, context));
}

function matchesCondition(condition: RuleCondition, context: RuleEvaluationContext): boolean {
  const value = resolveField(condition.field, context);

  switch (condition.op) {
    case "eq":
      return value === condition.value;
    case "neq":
      return value !== condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(String(value));
    case "gte":
      return Number(value) >= Number(condition.value);
    case "lte":
      return Number(value) <= Number(condition.value);
    case "contains":
      return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
    default:
      return false;
  }
}

function resolveField(field: string, context: RuleEvaluationContext): unknown {
  if (field === "severity") return context.severity;
  if (field === "finding.cvss_score" || field === "cvss_score") return context.cvssScore;
  if (field === "vuln_group.cve_id" || field === "cve_id") return context.cveId;
  if (field === "ci.environment") return context.ci?.environment;
  if (field === "ci.className" || field === "ci.class_id") return context.ci?.className ?? context.ci?.classId;
  if (field.startsWith("ci.attributes.")) {
    const key = field.replace("ci.attributes.", "");
    return context.ci?.attributes[key];
  }
  return undefined;
}
