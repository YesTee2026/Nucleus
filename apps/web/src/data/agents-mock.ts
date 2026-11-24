export type AgentKind =
  | "discovery"
  | "manage"
  | "relationship"
  | "classification"
  | "reporting";
export type AgentProvider = "claude" | "cursor";
export type AgentRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type StagingStatus = "pending" | "confirmed" | "rejected" | "promoted";
export type MemoryKind =
  | "class_mapping"
  | "category_mapping"
  | "type_mapping"
  | "relationship_hint"
  | "field_hint";
export type AgentScheduleCadence =
  | "manual"
  | "15m"
  | "1h"
  | "6h"
  | "daily"
  | "weekly"
  | "cron";

export interface AgentDef {
  id: string;
  name: string;
  kind: AgentKind;
  description: string;
  provider: AgentProvider;
  model?: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: AgentRunStatus | "never";
  scheduleEnabled: boolean;
  scheduleCadence: AgentScheduleCadence;
  /** Used when cadence is `cron` (5-field). Mock runner also accepts simple presets. */
  scheduleCron: string | null;
  scheduleTimezone: string;
  nextRunAt: string | null;
  lastScheduledAt: string | null;
}

export const SCHEDULE_CADENCE_LABELS: Record<AgentScheduleCadence, string> = {
  manual: "Manual only",
  "15m": "Every 15 minutes",
  "1h": "Hourly",
  "6h": "Every 6 hours",
  daily: "Daily",
  weekly: "Weekly",
  cron: "Custom cron",
};

export const CADENCE_MS: Record<Exclude<AgentScheduleCadence, "manual" | "cron">, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  daily: 24 * 60 * 60_000,
  weekly: 7 * 24 * 60 * 60_000,
};

/** Approximate next run for mock schedules (cron uses daily fallback). */
export function computeNextRunAt(
  cadence: AgentScheduleCadence,
  from: Date = new Date(),
  cron?: string | null,
): string | null {
  if (cadence === "manual") return null;
  if (cadence === "cron") {
    // Lightweight mock: if cron looks like "0 */N * * *" treat as every N hours, else daily
    const everyHours = cron?.match(/^\S+\s+\*\/(\d+)\s+/);
    if (everyHours) {
      const hours = Math.max(1, Number(everyHours[1]) || 1);
      return new Date(from.getTime() + hours * 60 * 60_000).toISOString();
    }
    return new Date(from.getTime() + CADENCE_MS.daily).toISOString();
  }
  return new Date(from.getTime() + CADENCE_MS[cadence]).toISOString();
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentName: string;
  provider: AgentProvider;
  status: AgentRunStatus;
  summary: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  createdAt: string;
  finishedAt: string | null;
}

export interface StagingItem {
  id: string;
  proposedName: string;
  proposedClass: string | null;
  proposedCategory: string | null;
  proposedType: string | null;
  unknownReason: string;
  matchKeys: Record<string, string>;
  attributes: Record<string, unknown>;
  confidence: number;
  status: StagingStatus;
  agentRunId: string | null;
  confirmedClass?: string;
  confirmedBy?: string;
  createdAt: string;
}

export interface AgentMemoryItem {
  id: string;
  kind: MemoryKind;
  pattern: string;
  resolvedClass: string | null;
  resolvedCategory: string | null;
  resolvedType: string | null;
  hitCount: number;
  source: string;
  createdBy?: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const AGENT_KIND_LABELS: Record<AgentKind, string> = {
  discovery: "Discovery",
  manage: "Manage",
  relationship: "Relationships",
  classification: "Classification",
  reporting: "Reporting",
};

export type ReportChatRole = "user" | "assistant" | "system";

export interface ReportChatMessage {
  id: string;
  role: ReportChatRole;
  content: string;
  createdAt: string;
  reportTitle?: string;
}

export interface ReportChatThread {
  id: string;
  title: string;
  messages: ReportChatMessage[];
  updatedAt: string;
}

export interface ReportContextSnapshot {
  totalCis: number;
  activeCis: number;
  classBreakdown: { name: string; count: number }[];
  relationshipCount: number;
  pendingStaging: number;
  pendingReview: number;
  memoryCount: number;
  openVulnTickets: number;
  criticalVulnTickets: number;
  discoverySources: number;
  recentAgentRuns: number;
}

export const REPORT_SUGGESTIONS = [
  "Executive CMDB health summary for this week",
  "Management briefing on discovery and staging backlog",
  "Vulnerability exposure report for leadership",
  "Asset inventory by class with gaps and recommendations",
  "Operational readiness: agents, schedules, and memory learning",
];

export function generateBusinessReport(
  prompt: string,
  ctx: ReportContextSnapshot,
): { title: string; content: string } {
  const lower = prompt.toLowerCase();
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isVuln = /vuln|security|cve|risk|exposure/.test(lower);
  const isDiscovery = /discover|staging|review|onboard/.test(lower);
  const isInventory = /inventory|asset|class|cmdb|fleet/.test(lower);
  const isOps = /agent|schedule|operat|memory|learning/.test(lower);

  let title = "CMDB Business Report";
  if (isVuln) title = "Vulnerability Exposure Briefing";
  else if (isDiscovery) title = "Discovery & Onboarding Status";
  else if (isInventory) title = "Asset Inventory Snapshot";
  else if (isOps) title = "CMDB Operations & Agent Report";
  else if (/executive|management|leadership|board/.test(lower)) {
    title = "Executive CMDB Health Summary";
  }

  const topClasses = ctx.classBreakdown
    .slice(0, 5)
    .map((c) => `• ${c.name}: ${c.count}`)
    .join("\n");

  const coveragePct =
    ctx.totalCis > 0 ? Math.round((ctx.activeCis / ctx.totalCis) * 100) : 0;

  const recommendations: string[] = [];
  if (ctx.pendingStaging > 0) {
    recommendations.push(
      `Clear ${ctx.pendingStaging} staged unknown asset(s) — confirm class to teach agents and reduce backlog.`,
    );
  }
  if (ctx.pendingReview > 0) {
    recommendations.push(
      `Approve or reject ${ctx.pendingReview} discovery review item(s) before merge drift grows.`,
    );
  }
  if (ctx.criticalVulnTickets > 0) {
    recommendations.push(
      `Prioritize ${ctx.criticalVulnTickets} critical vulnerability ticket(s) with named owners this week.`,
    );
  }
  if (ctx.memoryCount < 5) {
    recommendations.push(
      "Increase classification memory by confirming a few representative unknowns so similar assets auto-resolve.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Maintain current cadence: weekly discovery runs, daily manage agent, and monthly executive briefing.",
    );
  }

  let bodyFocus = "";
  if (isVuln) {
    bodyFocus = `## Security posture
Open remediation tickets: **${ctx.openVulnTickets}** (critical: **${ctx.criticalVulnTickets}**).
Tie tickets to CIs in the CMDB so risk is visible by business service and owner.`;
  } else if (isDiscovery) {
    bodyFocus = `## Discovery pipeline
Discovery sources configured: **${ctx.discoverySources}**.
Pending review queue: **${ctx.pendingReview}**.
Agent staging (unknown class/type): **${ctx.pendingStaging}**.
Focus: reduce time-to-CI for newly discovered assets.`;
  } else if (isInventory) {
    bodyFocus = `## Inventory
Total CIs: **${ctx.totalCis}** · Active: **${ctx.activeCis}** (${coveragePct}% active).
Relationships mapped: **${ctx.relationshipCount}**.

### Top classes
${topClasses || "• No class breakdown available"}`;
  } else if (isOps) {
    bodyFocus = `## Agent operations
Recent agent runs: **${ctx.recentAgentRuns}**.
Learned memories: **${ctx.memoryCount}**.
Staging backlog: **${ctx.pendingStaging}**.
Recommendation: schedule Discovery hourly and Classification after each staging surge.`;
  } else {
    bodyFocus = `## Snapshot
• Configuration items: **${ctx.totalCis}** (${ctx.activeCis} active)
• Relationships: **${ctx.relationshipCount}**
• Discovery review pending: **${ctx.pendingReview}**
• Agent staging pending: **${ctx.pendingStaging}**
• Open vuln tickets: **${ctx.openVulnTickets}** (critical ${ctx.criticalVulnTickets})
• Agent memory entries: **${ctx.memoryCount}**

### Class mix
${topClasses || "• No class breakdown available"}`;
  }

  const content = `# ${title}
*Generated ${date} · Audience: business & management*

${bodyFocus}

## Recommendations
${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

## Ask next
You can refine this report — for example: “Add risk by business service”, “Compare week-over-week staging”, or “Draft an email to leadership”.`;

  return { title, content };
}

export const PROVIDER_LABELS: Record<AgentProvider, string> = {
  claude: "Anthropic Claude",
  cursor: "Cursor SDK",
};

export const seedAgents: AgentDef[] = [
  {
    id: "agt-discovery",
    name: "Discovery Agent",
    kind: "discovery",
    description: "Ingest discovery data, classify assets, stage unknowns",
    provider: "claude",
    enabled: true,
    lastRunAt: "2026-06-29T08:00:00Z",
    lastRunStatus: "succeeded",
    scheduleEnabled: true,
    scheduleCadence: "1h",
    scheduleCron: null,
    scheduleTimezone: "Australia/Sydney",
    nextRunAt: computeNextRunAt("1h"),
    lastScheduledAt: "2026-06-29T08:00:00Z",
  },
  {
    id: "agt-manage",
    name: "Manage Agent",
    kind: "manage",
    description: "Manage CIs and review staging backlog",
    provider: "claude",
    enabled: true,
    lastRunAt: "2026-06-28T16:20:00Z",
    lastRunStatus: "succeeded",
    scheduleEnabled: true,
    scheduleCadence: "daily",
    scheduleCron: null,
    scheduleTimezone: "Australia/Sydney",
    nextRunAt: computeNextRunAt("daily"),
    lastScheduledAt: "2026-06-28T16:20:00Z",
  },
  {
    id: "agt-relationship",
    name: "Relationship Agent",
    kind: "relationship",
    description: "Propose relationships between configuration items",
    provider: "cursor",
    enabled: true,
    lastRunAt: "2026-06-29T07:10:00Z",
    lastRunStatus: "succeeded",
    scheduleEnabled: false,
    scheduleCadence: "manual",
    scheduleCron: null,
    scheduleTimezone: "Australia/Sydney",
    nextRunAt: null,
    lastScheduledAt: null,
  },
  {
    id: "agt-classification",
    name: "Classification Agent",
    kind: "classification",
    description: "Classify unknown type/category/class with human-in-the-loop learning",
    provider: "claude",
    enabled: true,
    lastRunAt: null,
    lastRunStatus: "never",
    scheduleEnabled: false,
    scheduleCadence: "6h",
    scheduleCron: null,
    scheduleTimezone: "Australia/Sydney",
    nextRunAt: null,
    lastScheduledAt: null,
  },
  {
    id: "agt-reporting",
    name: "Reporting Agent",
    kind: "reporting",
    description: "Chat-driven business and management reports from CMDB, discovery, and risk data",
    provider: "claude",
    enabled: true,
    lastRunAt: null,
    lastRunStatus: "never",
    scheduleEnabled: false,
    scheduleCadence: "weekly",
    scheduleCron: null,
    scheduleTimezone: "Australia/Sydney",
    nextRunAt: null,
    lastScheduledAt: null,
  },
];

export const seedAgentRuns: AgentRun[] = [
  {
    id: "run-1",
    agentId: "agt-discovery",
    agentName: "Discovery Agent",
    provider: "claude",
    status: "succeeded",
    summary: "Parked unknown asset iot-gateway-17 in staging for confirmation",
    input: { raw: { hostname: "iot-gateway-17", vendor: "AcmeIoT" } },
    output: { action: "staged", stagingId: "stg-1" },
    createdAt: "2026-06-29T08:00:00Z",
    finishedAt: "2026-06-29T08:00:04Z",
  },
  {
    id: "run-2",
    agentId: "agt-relationship",
    agentName: "Relationship Agent",
    provider: "cursor",
    status: "succeeded",
    summary: "Proposed relationship Order Portal → orders-db-primary",
    input: { sourceQuery: "Order Portal", targetQuery: "orders-db", relationshipType: "depends_on" },
    output: { action: "propose_relationship" },
    createdAt: "2026-06-29T07:10:00Z",
    finishedAt: "2026-06-29T07:10:08Z",
  },
  {
    id: "run-3",
    agentId: "agt-manage",
    agentName: "Manage Agent",
    provider: "claude",
    status: "succeeded",
    summary: "Manage agent scanned CIs and staging queue",
    input: { query: "web" },
    output: { action: "manage_summary" },
    createdAt: "2026-06-28T16:20:00Z",
    finishedAt: "2026-06-28T16:20:03Z",
  },
];

export const seedStaging: StagingItem[] = [
  {
    id: "stg-1",
    proposedName: "iot-gateway-17",
    proposedClass: null,
    proposedCategory: "edge",
    proposedType: "iot_gateway",
    unknownReason: "Unknown class/category/type — awaiting authorized confirmation",
    matchKeys: { hostname: "iot-gateway-17", ip_address: "10.0.9.17" },
    attributes: { vendor: "AcmeIoT", firmware: "2.1.0" },
    confidence: 0.25,
    status: "pending",
    agentRunId: "run-1",
    createdAt: "2026-06-29T08:00:04Z",
  },
  {
    id: "stg-2",
    proposedName: "k8s-worker-node-04",
    proposedClass: "cmdb_ci_server",
    proposedCategory: "compute",
    proposedType: null,
    unknownReason: "Type could not be resolved from discovery payload",
    matchKeys: { hostname: "k8s-worker-node-04" },
    attributes: { os: "Ubuntu 24.04", role: "kubernetes_worker" },
    confidence: 0.4,
    status: "pending",
    agentRunId: null,
    createdAt: "2026-06-28T12:00:00Z",
  },
  {
    id: "stg-3",
    proposedName: "iot-sensor-22",
    proposedClass: null,
    proposedCategory: "edge",
    proposedType: "iot_sensor",
    unknownReason: "No memory match for iot_sensor pattern",
    matchKeys: { hostname: "iot-sensor-22", ip_address: "10.0.9.22" },
    attributes: { vendor: "AcmeIoT", model: "S-200" },
    confidence: 0.2,
    status: "pending",
    agentRunId: null,
    createdAt: "2026-06-29T09:12:00Z",
  },
  {
    id: "stg-4",
    proposedName: "edge-router-lab-03",
    proposedClass: null,
    proposedCategory: null,
    proposedType: "router",
    unknownReason: "Category and class unresolved",
    matchKeys: { hostname: "edge-router-lab-03", serial_number: "ER-8831" },
    attributes: { vendor: "Cisco", model: "ISR" },
    confidence: 0.35,
    status: "pending",
    agentRunId: null,
    createdAt: "2026-06-29T09:40:00Z",
  },
  {
    id: "stg-5",
    proposedName: "redis-cache-staging",
    proposedClass: null,
    proposedCategory: "data",
    proposedType: "cache",
    unknownReason: "Cache services not mapped to a CI class yet",
    matchKeys: { hostname: "redis-cache-staging" },
    attributes: { engine: "redis", version: "7.2" },
    confidence: 0.3,
    status: "pending",
    agentRunId: null,
    createdAt: "2026-06-29T10:05:00Z",
  },
];

/** Tokenize a staging item into patterns used for memory learning / lookup. */
export function extractStagingPatterns(item: {
  proposedName?: string | null;
  proposedType?: string | null;
  proposedCategory?: string | null;
  attributes?: Record<string, unknown>;
  matchKeys?: Record<string, string>;
}): string[] {
  const raw: string[] = [
    item.proposedType ?? "",
    item.proposedCategory ?? "",
    item.proposedName ?? "",
    String(item.attributes?.vendor ?? ""),
    String(item.attributes?.engine ?? ""),
    String(item.attributes?.role ?? ""),
    String(item.attributes?.model ?? ""),
    String(item.matchKeys?.hostname ?? ""),
  ];

  const patterns = new Set<string>();
  for (const value of raw) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    patterns.add(trimmed.toLowerCase());
    for (const part of trimmed.toLowerCase().split(/[^a-z0-9]+/)) {
      if (part.length >= 3) patterns.add(part);
    }
  }

  // Family prefixes so iot_gateway teaches iot_sensor via shared "iot"
  const type = (item.proposedType ?? "").toLowerCase();
  if (type.includes("iot")) patterns.add("iot");
  if (type.includes("gateway") || type.includes("sensor")) patterns.add("edge_device");
  if (type.includes("cache") || type.includes("redis")) patterns.add("cache");

  return [...patterns];
}

export function findMemoryForStaging(
  item: {
    proposedName?: string | null;
    proposedType?: string | null;
    proposedCategory?: string | null;
    attributes?: Record<string, unknown>;
    matchKeys?: Record<string, string>;
  },
  memories: AgentMemoryItem[],
): AgentMemoryItem | null {
  const candidates = extractStagingPatterns(item);
  if (candidates.length === 0 || memories.length === 0) return null;

  let best: { mem: AgentMemoryItem; score: number } | null = null;
  for (const mem of memories) {
    if (!mem.resolvedClass) continue;
    const pattern = mem.pattern.toLowerCase();
    let score = 0;
    for (const c of candidates) {
      if (c === pattern) score += 10;
      else if (c.includes(pattern) || pattern.includes(c)) score += 4;
    }
    // Prefer type/category exact matches
    if (item.proposedType && pattern === item.proposedType.toLowerCase()) score += 8;
    if (item.proposedCategory && pattern === item.proposedCategory.toLowerCase()) score += 5;
    if (score > 0 && (!best || score > best.score)) best = { mem, score };
  }
  return best && best.score >= 4 ? best.mem : null;
}

export function buildMemoriesFromConfirmation(input: {
  className: string;
  category?: string | null;
  typeHint?: string | null;
  name?: string | null;
  attributes?: Record<string, unknown>;
  matchKeys?: Record<string, string>;
}): Omit<AgentMemoryItem, "id" | "createdAt" | "lastUsedAt" | "hitCount">[] {
  const patterns = extractStagingPatterns({
    proposedName: input.name,
    proposedType: input.typeHint,
    proposedCategory: input.category,
    attributes: input.attributes,
    matchKeys: input.matchKeys,
  });
  const unique = [...new Set(patterns)];
  return unique.map((pattern) => ({
    kind: "class_mapping" as const,
    pattern,
    resolvedClass: input.className,
    resolvedCategory: input.category ?? null,
    resolvedType: input.typeHint ?? null,
    source: "user_confirm",
    createdBy: "Admin User",
  }));
}

/** Heuristic parse of free-text classify instructions for mock / local runs. */
export function parseClassifyInstructions(
  instructions: string,
  knownClasses: { name: string; displayName: string }[],
): { className?: string; category?: string; typeHint?: string } {
  const text = instructions.trim();
  const lower = text.toLowerCase();
  const result: { className?: string; category?: string; typeHint?: string } = {};

  const classMatch = text.match(/\b(?:class|ci\s*class)\s*[:=]\s*([a-z0-9_ -]+)/i);
  const categoryMatch = text.match(/\bcategory\s*[:=]\s*([a-z0-9_ -]+)/i);
  const typeMatch = text.match(/\b(?:type|typeHint|type hint)\s*[:=]\s*([a-z0-9_ -]+)/i);
  if (classMatch) result.className = classMatch[1].trim().replace(/\s+/g, "_");
  if (categoryMatch) result.category = categoryMatch[1].trim();
  if (typeMatch) result.typeHint = typeMatch[1].trim().replace(/\s+/g, "_");

  for (const cls of knownClasses) {
    const dn = cls.displayName.toLowerCase();
    const nm = cls.name.toLowerCase();
    if (
      lower.includes(nm) ||
      lower.includes(dn) ||
      lower.includes(`as ${dn}`) ||
      lower.includes(`as a ${dn}`) ||
      lower.includes(`as an ${dn}`)
    ) {
      result.className = result.className ?? cls.name;
      break;
    }
  }

  const keywordMap: { pattern: RegExp; className: string; category?: string; typeHint?: string }[] = [
    { pattern: /\biot[-_\s]?gateway/i, className: "cmdb_ci_network", category: "edge", typeHint: "iot_gateway" },
    { pattern: /\biot[-_\s]?sensor/i, className: "cmdb_ci_network", category: "edge", typeHint: "iot_sensor" },
    { pattern: /\b(router|switch|firewall|network)\b/i, className: "cmdb_ci_network", category: "network" },
    { pattern: /\b(postgres|mysql|database|rdbms|redis|cache)\b/i, className: "cmdb_ci_database", category: "data" },
    { pattern: /\b(k8s|kubernetes|worker|server|host|vm)\b/i, className: "cmdb_ci_server", category: "compute" },
    { pattern: /\b(app|application|portal)\b/i, className: "cmdb_ci_application", category: "app" },
    { pattern: /\bstorage|san|nas\b/i, className: "cmdb_ci_storage", category: "storage" },
  ];
  for (const rule of keywordMap) {
    if (rule.pattern.test(text)) {
      result.className = result.className ?? rule.className;
      result.category = result.category ?? rule.category;
      result.typeHint = result.typeHint ?? rule.typeHint;
      break;
    }
  }

  return result;
}

export const seedMemories: AgentMemoryItem[] = [
  {
    id: "mem-1",
    kind: "class_mapping",
    pattern: "catalyst",
    resolvedClass: "cmdb_ci_network",
    resolvedCategory: "network",
    resolvedType: "switch",
    hitCount: 12,
    source: "user_confirm",
    createdBy: "Admin User",
    createdAt: "2026-06-01T10:00:00Z",
    lastUsedAt: "2026-06-27T18:00:00Z",
  },
  {
    id: "mem-2",
    kind: "class_mapping",
    pattern: "postgresql",
    resolvedClass: "cmdb_ci_database",
    resolvedCategory: "data",
    resolvedType: "rdbms",
    hitCount: 8,
    source: "user_confirm",
    createdBy: "Admin User",
    createdAt: "2026-06-10T09:00:00Z",
    lastUsedAt: "2026-06-26T11:00:00Z",
  },
];
