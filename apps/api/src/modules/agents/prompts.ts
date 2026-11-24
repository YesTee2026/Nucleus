import type { AgentKind } from "@nucleus/shared";

const common = `
You are a Nucleus CMDB platform agent.
Rules:
- Never invent CI class names that are not returned by list_ci_classes or agent memory.
- If class, category, or type is unknown, call stage_unknown_ci and stop for human confirmation.
- When a human later confirms staging, that confirmation becomes durable Postgres memory.
- Prefer lookup_memory before staging.
`.trim();

export const AGENT_PROMPTS: Record<AgentKind, string> = {
  discovery: `${common}

You are the Discovery Agent.
Ingest discovery payloads, normalize assets, classify when possible, and stage unknowns.`,
  manage: `${common}

You are the Manage Agent.
Find CIs, summarize staging backlog, and recommend CMDB hygiene actions.`,
  relationship: `${common}

You are the Relationship Agent.
Resolve CIs and propose typed relationships with clear rationale. Do not invent CIs.`,
  classification: `${common}

You are the Classification Agent.
Resolve unknown type/category/class using memory and known CI classes; stage when unsure.`,
  reporting: `You are the Nucleus Reporting Agent for business and management audiences.
Produce clear executive-ready reports from CMDB, discovery, staging, agent, and vulnerability context.
Use headings, bullet metrics, and actionable recommendations. Do not invent CIs or tickets — use tools and provided context.
Tone: concise, board-friendly, outcome-oriented.`,
};

export function defaultAgentsSeed() {
  const nextHour = new Date(Date.now() + 60 * 60_000);
  const nextDay = new Date(Date.now() + 24 * 60 * 60_000);
  return [
    {
      name: "Discovery Agent",
      kind: "discovery" as const,
      description: "Ingest discovery data, classify assets, stage unknowns",
      provider: "claude" as const,
      systemPrompt: AGENT_PROMPTS.discovery,
      enabled: true,
      config: {},
      scheduleEnabled: true,
      scheduleCadence: "1h" as const,
      scheduleTimezone: "UTC",
      nextRunAt: nextHour,
    },
    {
      name: "Manage Agent",
      kind: "manage" as const,
      description: "Manage CIs and review staging backlog",
      provider: "claude" as const,
      systemPrompt: AGENT_PROMPTS.manage,
      enabled: true,
      config: {},
      scheduleEnabled: true,
      scheduleCadence: "daily" as const,
      scheduleTimezone: "UTC",
      nextRunAt: nextDay,
    },
    {
      name: "Relationship Agent",
      kind: "relationship" as const,
      description: "Propose relationships between configuration items",
      provider: "cursor" as const,
      systemPrompt: AGENT_PROMPTS.relationship,
      enabled: true,
      config: {},
      scheduleEnabled: false,
      scheduleCadence: "manual" as const,
      scheduleTimezone: "UTC",
    },
    {
      name: "Classification Agent",
      kind: "classification" as const,
      description: "Classify unknown type/category/class with human-in-the-loop learning",
      provider: "claude" as const,
      systemPrompt: AGENT_PROMPTS.classification,
      enabled: true,
      config: {},
      scheduleEnabled: false,
      scheduleCadence: "manual" as const,
      scheduleTimezone: "UTC",
    },
    {
      name: "Reporting Agent",
      kind: "reporting" as const,
      description: "Chat-driven business and management reports from CMDB and risk data",
      provider: "claude" as const,
      systemPrompt: AGENT_PROMPTS.reporting,
      enabled: true,
      config: {},
      scheduleEnabled: false,
      scheduleCadence: "weekly" as const,
      scheduleTimezone: "UTC",
    },
  ];
}
