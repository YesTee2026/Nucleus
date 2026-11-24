import {
  activityConflicts,
  ciClasses,
  ciRelationships,
  configurationItems as seedCis,
  dashboardStats as seedDashboardStats,
  fieldDefinitions as seedFields,
  relationshipTypes,
  type CiClass,
  type CiRelationship,
  type CiStatus,
  type ConfigurationItem,
  type Environment,
  type FieldDefinition,
  type ClassTreeNode,
} from "@/data/mock";
import {
  discoverySources as seedSources,
  fieldAliases as seedAliases,
  fieldMaps as seedMaps,
  reviewQueue as seedReview,
  type DiscoverySource,
  type DiscoverySourceType,
  type FieldAlias,
  type FieldMapEntry,
  type FieldTransform,
  type ReviewQueueItem,
} from "@/data/discovery-mock";
import {
  assignmentRules as seedRules,
  scannerConnections as seedScanners,
  vulnFindings as seedFindings,
  vulnGroups as seedGroups,
  vulnTickets as seedTickets,
  type AssignmentRule,
  type ScannerAdapterType,
  type ScannerConnection,
  type TicketStatus,
  type VulnFinding,
  type VulnGroup,
  type VulnTicket,
} from "@/data/vuln-mock";
import {
  seedAgents,
  seedAgentRuns,
  seedMemories,
  seedStaging,
  buildMemoriesFromConfirmation,
  computeNextRunAt,
  findMemoryForStaging,
  generateBusinessReport,
  parseClassifyInstructions,
  SCHEDULE_CADENCE_LABELS,
  type AgentDef,
  type AgentMemoryItem,
  type AgentProvider,
  type AgentRun,
  type AgentScheduleCadence,
  type ReportChatThread,
  type StagingItem,
} from "@/data/agents-mock";
import {
  loadSettings,
  saveSettings,
  type PlatformSettings,
} from "@/data/settings";
import { ToastViewport, type ToastItem, type ToastTone } from "@/components/ui/Toast";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface AppStoreValue {
  // CMDB
  cis: ConfigurationItem[];
  classes: CiClass[];
  fields: FieldDefinition[];
  relationships: CiRelationship[];
  relationshipTypes: typeof relationshipTypes;
  conflicts: typeof activityConflicts;
  // Discovery
  discoverySources: DiscoverySource[];
  fieldMaps: FieldMapEntry[];
  fieldAliases: FieldAlias[];
  reviewQueue: ReviewQueueItem[];
  // Vuln
  scanners: ScannerConnection[];
  findings: VulnFinding[];
  groups: VulnGroup[];
  tickets: VulnTicket[];
  rules: AssignmentRule[];
  // UI
  toasts: ToastItem[];
  notifications: { id: string; message: string; read: boolean; at: string }[];
  toast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  markNotificationsRead: () => void;
  // Lookups
  getCiById: (id: string) => ConfigurationItem | undefined;
  getFieldsForClass: (classId: string) => FieldDefinition[];
  getRelationshipsForCi: (ciId: string) => CiRelationship[];
  buildClassTree: () => ClassTreeNode[];
  getTicketById: (id: string) => VulnTicket | undefined;
  getTicketsForGroup: (cveId: string) => VulnTicket[];
  getFindingsForCi: (ciId: string) => VulnFinding[];
  getTicketsForCi: (ciId: string) => VulnTicket[];
  getFindingsForGroup: (cveId: string) => VulnFinding[];
  getGroupByCve: (cveId: string) => VulnGroup | undefined;
  dashboardStats: () => {
    totalCis: number;
    activeCis: number;
    discoveredToday: number;
    openConflicts: number;
    classesDefined: number;
    relationships: number;
  };
  discoveryStats: () => {
    sourceCount: number;
    enabledSources: number;
    pendingReview: number;
    mergedToday: number;
    createdToday: number;
  };
  vulnStats: () => {
    openTickets: number;
    activeFindings: number;
    bySeverity: Record<string, number>;
    slaAtRisk: number;
    slaBreached: number;
    topCves: { cveId: string; title: string; severity: string; affectedCiCount: number }[];
  };
  // Actions — CMDB
  addClass: (input: { name: string; displayName: string; parentId: string | null; isAbstract: boolean }) => void;
  addField: (input: {
    classId: string;
    name: string;
    displayName: string;
    dataType: FieldDefinition["dataType"];
    isRequired: boolean;
    isDiscoveryKey: boolean;
  }) => void;
  addCi: (input: {
    name: string;
    classId: string;
    environment: Environment;
    status: CiStatus;
  }) => ConfigurationItem;
  updateCi: (id: string, patch: Partial<ConfigurationItem>) => void;
  deleteCi: (id: string) => void;
  addRelationship: (input: {
    sourceCiId: string;
    targetCiId: string;
    relationshipTypeId: string;
  }) => void;
  // Actions — Discovery
  addDiscoverySource: (input: {
    name: string;
    type: DiscoverySourceType;
    className: string;
    host: string;
    port: number;
    connectionString: string;
  }) => void;
  testDiscoveryConnection: (input: {
    host: string;
    port: number;
    connectionString: string;
    type: DiscoverySourceType;
  }) => boolean;
  runDiscoverySource: (id: string) => void;
  addFieldMap: (input: {
    discoverySourceId: string;
    sourceField: string;
    targetField: string;
    transform: FieldTransform;
    transformArg?: string;
  }) => void;
  updateFieldMap: (id: string, patch: Partial<FieldMapEntry>) => void;
  updateReviewItem: (
    id: string,
    patch: {
      name?: string;
      className?: string;
      matchKeys?: Record<string, string | number | boolean>;
      attributes?: Record<string, unknown>;
      confidence?: ReviewQueueItem["confidence"];
      matchCiId?: string | null;
      matchCiName?: string | null;
    },
  ) => void;
  approveReviewItem: (
    id: string,
    patch?: {
      name?: string;
      className?: string;
      matchKeys?: Record<string, string | number | boolean>;
      attributes?: Record<string, unknown>;
      confidence?: ReviewQueueItem["confidence"];
      matchCiId?: string | null;
      matchCiName?: string | null;
    },
  ) => void;
  rejectReviewItem: (id: string) => void;
  // Actions — Vuln
  addScanner: (input: {
    name: string;
    adapterType: ScannerAdapterType;
    baseUrl: string;
  }) => void;
  updateScanner: (id: string, patch: Partial<ScannerConnection>) => void;
  testScanner: (id: string) => void;
  syncScanner: (id: string) => void;
  addTicket: (input: {
    cveId: string;
    ciId: string;
    title: string;
    severity: VulnTicket["severity"];
  }) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  assignTicket: (id: string, assigneeName: string, assignedTeam?: string) => void;
  addRule: (input: {
    name: string;
    priority: number;
    assignedTeam: string;
    severity: string;
  }) => void;
  updateRule: (id: string, patch: Partial<AssignmentRule>) => void;
  testRule: (id: string) => void;
  // Agents
  agents: AgentDef[];
  agentRuns: AgentRun[];
  stagingItems: StagingItem[];
  agentMemories: AgentMemoryItem[];
  agentStats: () => {
    agentCount: number;
    enabledAgents: number;
    pendingStaging: number;
    memoryCount: number;
    recentRuns: AgentRun[];
  };
  runAgent: (agentId: string, input?: Record<string, unknown>, provider?: AgentProvider) => void;
  updateStagingItem: (
    id: string,
    patch: {
      proposedName?: string;
      proposedClass?: string | null;
      proposedCategory?: string | null;
      proposedType?: string | null;
      matchKeys?: Record<string, string>;
      attributes?: Record<string, unknown>;
      unknownReason?: string;
      confidence?: number;
    },
  ) => void;
  confirmStaging: (
    id: string,
    input: {
      className: string;
      category?: string;
      typeHint?: string;
      remember?: boolean;
      /** When true (default), apply learned mapping to similar pending staging items as proposals. */
      applyToSimilar?: boolean;
      name?: string;
      matchKeys?: Record<string, string>;
      attributes?: Record<string, unknown>;
    },
  ) => void;
  /** Re-run classification agent over pending staging using learned memory. */
  reprocessStagingWithMemory: (opts?: {
    promoteMatches?: boolean;
    agentId?: string;
  }) => { matched: number; promoted: number };
  rejectStaging: (id: string, reason?: string) => void;
  instructClassifyStaging: (
    ids: string[],
    input: {
      instructions: string;
      className?: string;
      category?: string;
      typeHint?: string;
      remember?: boolean;
      promote?: boolean;
    },
  ) => void;
  bulkRejectStaging: (ids: string[], reason?: string) => void;
  toggleAgent: (id: string) => void;
  updateAgentSchedule: (
    id: string,
    input: {
      scheduleEnabled: boolean;
      scheduleCadence: AgentScheduleCadence;
      scheduleCron?: string | null;
      scheduleTimezone?: string;
    },
  ) => void;
  runDueAgentSchedules: () => number;
  // Settings
  settings: PlatformSettings;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  updateAgentSettings: (patch: Partial<PlatformSettings["agents"]>) => void;
  clearAgentApiKeys: () => void;
  // Reporting chat
  reportThreads: ReportChatThread[];
  activeReportThreadId: string | null;
  createReportThread: (title?: string) => string;
  setActiveReportThread: (id: string | null) => void;
  sendReportMessage: (prompt: string, threadId?: string) => void;
  deleteReportThread: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [cis, setCis] = useState(() => [...seedCis]);
  const [classes, setClasses] = useState(() => [...ciClasses]);
  const [fields, setFields] = useState(() => [...seedFields]);
  const [relationships, setRelationships] = useState(() => [...ciRelationships]);
  const [discoverySources, setDiscoverySources] = useState(() => [...seedSources]);
  const [fieldMaps, setFieldMaps] = useState(() => [...seedMaps]);
  const [fieldAliases] = useState(() => [...seedAliases]);
  const [reviewQueue, setReviewQueue] = useState(() => [...seedReview]);
  const [scanners, setScanners] = useState(() => [...seedScanners]);
  const [findings] = useState(() => [...seedFindings]);
  const [groups] = useState(() => [...seedGroups]);
  const [tickets, setTickets] = useState(() => [...seedTickets]);
  const [rules, setRules] = useState(() => [...seedRules]);
  const [agents, setAgents] = useState(() => [...seedAgents]);
  const [agentRuns, setAgentRuns] = useState(() => [...seedAgentRuns]);
  const [stagingItems, setStagingItems] = useState(() => [...seedStaging]);
  const [agentMemories, setAgentMemories] = useState(() => [...seedMemories]);
  const [settings, setSettings] = useState<PlatformSettings>(() => loadSettings());
  const [reportThreads, setReportThreads] = useState<ReportChatThread[]>([]);
  const [activeReportThreadId, setActiveReportThreadId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      message: "4 discovery items awaiting review",
      read: false,
      at: new Date().toISOString(),
    },
    {
      id: "n2",
      message: "SLA breach risk on VULN-2024-001",
      read: false,
      at: new Date().toISOString(),
    },
    {
      id: "n3",
      message: "2 staged assets await classification confirmation",
      read: false,
      at: new Date().toISOString(),
    },
  ]);
  const [mergedToday, setMergedToday] = useState(12);
  const [createdToday, setCreatedToday] = useState(5);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = uid("toast");
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismissToast(id), 3500);
    },
    [dismissToast],
  );

  const getCiById = useCallback((id: string) => cis.find((c) => c.id === id), [cis]);

  const getFieldsForClass = useCallback(
    (classId: string) => {
      const chain: string[] = [];
      let current = classes.find((c) => c.id === classId);
      while (current) {
        chain.unshift(current.id);
        current = current.parentId ? classes.find((c) => c.id === current!.parentId) : undefined;
      }
      const seen = new Set<string>();
      const result: FieldDefinition[] = [];
      for (const id of chain) {
        for (const f of fields.filter((fd) => fd.classId === id)) {
          if (!seen.has(f.name)) {
            seen.add(f.name);
            result.push(f);
          }
        }
      }
      return result;
    },
    [classes, fields],
  );

  const getRelationshipsForCi = useCallback(
    (ciId: string) => relationships.filter((r) => r.sourceCiId === ciId || r.targetCiId === ciId),
    [relationships],
  );

  const buildClassTree = useCallback(() => {
    const map = new Map<string, ClassTreeNode>();
    for (const c of classes) map.set(c.id, { ...c, children: [] });
    const roots: ClassTreeNode[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
      else if (!node.parentId) roots.push(node);
    }
    return roots;
  }, [classes]);

  const value = useMemo<AppStoreValue>(
    () => ({
      cis,
      classes,
      fields,
      relationships,
      relationshipTypes,
      conflicts: activityConflicts,
      discoverySources,
      fieldMaps,
      fieldAliases,
      reviewQueue,
      scanners,
      findings,
      groups,
      tickets,
      rules,
      agents,
      agentRuns,
      stagingItems,
      agentMemories,
      settings,
      reportThreads,
      activeReportThreadId,
      toasts,
      notifications,
      toast,
      dismissToast,
      markNotificationsRead: () =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      getCiById,
      getFieldsForClass,
      getRelationshipsForCi,
      buildClassTree,
      getTicketById: (id) => tickets.find((t) => t.id === id),
      getTicketsForGroup: (cveId) => tickets.filter((t) => t.cveId === cveId),
      getFindingsForCi: (ciId) => findings.filter((f) => f.ciId === ciId),
      getTicketsForCi: (ciId) => tickets.filter((t) => t.ciId === ciId),
      getFindingsForGroup: (cveId) => findings.filter((f) => f.cveId === cveId),
      getGroupByCve: (cveId) => groups.find((g) => g.cveId === cveId),
      dashboardStats: () => ({
        totalCis: Math.max(seedDashboardStats.totalCis, cis.length),
        activeCis: cis.filter((c) => c.status === "active").length || seedDashboardStats.activeCis,
        discoveredToday:
          cis.filter((c) => c.status === "discovered").length || seedDashboardStats.discoveredToday,
        openConflicts: activityConflicts.length,
        classesDefined: classes.length,
        relationships: relationships.length + (seedDashboardStats.relationships - ciRelationships.length),
      }),
      discoveryStats: () => ({
        sourceCount: discoverySources.length,
        enabledSources: discoverySources.filter((s) => s.enabled).length,
        pendingReview: reviewQueue.filter((r) => r.status === "pending").length,
        mergedToday,
        createdToday,
      }),
      vulnStats: () => {
        const open = tickets.filter((t) => !["closed", "verified"].includes(t.status));
        const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        for (const t of open) bySeverity[t.severity]++;
        const now = Date.now();
        const slaAtRisk = open.filter((t) => {
          const days = (new Date(t.dueDate).getTime() - now) / 86400000;
          return days <= 3 && days >= 0;
        }).length;
        const slaBreached = open.filter(
          (t) => t.slaBreachAt || new Date(t.dueDate).getTime() < now,
        ).length;
        return {
          openTickets: open.length,
          activeFindings: findings.filter((f) => f.status === "active").length,
          bySeverity,
          slaAtRisk,
          slaBreached,
          topCves: groups.slice(0, 5).map((g) => ({
            cveId: g.cveId,
            title: g.title,
            severity: g.maxSeverity,
            affectedCiCount: g.affectedCiCount,
          })),
        };
      },
      addClass: (input) => {
        const id = uid("ci-cls");
        setClasses((prev) => [
          ...prev,
          {
            id,
            name: input.name,
            displayName: input.displayName,
            parentId: input.parentId,
            isAbstract: input.isAbstract,
            ciCount: 0,
          },
        ]);
        toast(`Class “${input.displayName}” created`);
      },
      addField: (input) => {
        setFields((prev) => [
          ...prev,
          {
            id: uid("fld"),
            classId: input.classId,
            name: input.name,
            displayName: input.displayName,
            dataType: input.dataType,
            isRequired: input.isRequired,
            isStandard: false,
            isDiscoveryKey: input.isDiscoveryKey,
          },
        ]);
        toast(`Field “${input.displayName}” added`);
      },
      addCi: (input) => {
        const cls = classes.find((c) => c.id === input.classId);
        const created: ConfigurationItem = {
          id: uid("ci"),
          classId: input.classId,
          className: cls?.displayName ?? "Configuration Item",
          name: input.name,
          status: input.status,
          environment: input.environment,
          parentCiId: null,
          attributes: {},
          updatedAt: new Date().toISOString(),
        };
        setCis((prev) => [created, ...prev]);
        setClasses((prev) =>
          prev.map((c) => (c.id === input.classId ? { ...c, ciCount: c.ciCount + 1 } : c)),
        );
        toast(`CI “${input.name}” created`);
        return created;
      },
      updateCi: (id, patch) => {
        setCis((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
          ),
        );
        toast("Configuration item updated");
      },
      deleteCi: (id) => {
        const ci = cis.find((c) => c.id === id);
        setCis((prev) => prev.filter((c) => c.id !== id));
        setRelationships((prev) =>
          prev.filter((r) => r.sourceCiId !== id && r.targetCiId !== id),
        );
        if (ci) {
          setClasses((prev) =>
            prev.map((c) =>
              c.id === ci.classId ? { ...c, ciCount: Math.max(0, c.ciCount - 1) } : c,
            ),
          );
        }
        toast(`Deleted “${ci?.name ?? id}”`, "info");
      },
      addRelationship: (input) => {
        const type = relationshipTypes.find((t) => t.id === input.relationshipTypeId);
        setRelationships((prev) => [
          {
            id: uid("rel"),
            sourceCiId: input.sourceCiId,
            targetCiId: input.targetCiId,
            relationshipTypeId: input.relationshipTypeId,
            relationshipTypeName: type?.displayName ?? "Related To",
          },
          ...prev,
        ]);
        toast("Relationship created");
      },
      addDiscoverySource: (input) => {
        setDiscoverySources((prev) => [
          {
            id: uid("src"),
            name: input.name,
            type: input.type,
            className: input.className,
            host: input.host,
            port: input.port,
            connectionString: input.connectionString,
            enabled: true,
            lastRunAt: null,
            lastRunStatus: "never",
            fieldMapCount: 0,
          },
          ...prev,
        ]);
        toast(`Discovery source “${input.name}” added`);
      },
      testDiscoveryConnection: (input) => {
        const host = input.host.trim();
        const conn = input.connectionString.trim();
        if (!host && !conn) {
          toast("Enter a host or connection string before testing", "error");
          return false;
        }
        if (!input.port || input.port < 1 || input.port > 65535) {
          toast("Port must be between 1 and 65535", "error");
          return false;
        }
        // Mock reachability check — fail closed private ranges only if host looks invalid
        const looksInvalid = host.includes(" ") || (host.length > 0 && !/^[\w.-]+$/.test(host));
        if (looksInvalid) {
          toast("Connection failed — invalid host format", "error");
          return false;
        }
        const target = conn || `${host}:${input.port}`;
        toast(`Connection successful — reached ${target}`, "success");
        return true;
      },
      runDiscoverySource: (id) => {
        const source = discoverySources.find((s) => s.id === id);
        if (!source) return;
        setDiscoverySources((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  lastRunAt: new Date().toISOString(),
                  lastRunStatus: "success",
                }
              : s,
          ),
        );
        const newItem: ReviewQueueItem = {
          id: uid("rq"),
          discoverySourceId: id,
          sourceName: source.name,
          normalizedCi: {
            class: source.className,
            name: `discovered-${Date.now().toString().slice(-4)}`,
            matchKeys: {
              hostname: `host-${Date.now().toString().slice(-4)}.local`,
              ip_address: `10.0.${Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 200)}`,
            },
            attributes: { discovered_by: source.name },
          },
          matchCiId: null,
          matchCiName: null,
          confidence: "medium",
          status: "pending",
          createdAt: new Date().toISOString(),
          rawPreview: { HostName: "auto-discovered", source: source.name },
        };
        setReviewQueue((prev) => [newItem, ...prev]);
        setNotifications((prev) => [
          {
            id: uid("n"),
            message: `Discovery run completed for ${source.name}`,
            read: false,
            at: new Date().toISOString(),
          },
          ...prev,
        ]);
        toast(`Ran “${source.name}” — 1 item queued for review`);
      },
      addFieldMap: (input) => {
        setFieldMaps((prev) => [
          {
            id: uid("fm"),
            discoverySourceId: input.discoverySourceId,
            sourceField: input.sourceField,
            targetField: input.targetField,
            transform: input.transform,
            transformArg: input.transformArg,
          },
          ...prev,
        ]);
        setDiscoverySources((prev) =>
          prev.map((s) =>
            s.id === input.discoverySourceId
              ? { ...s, fieldMapCount: s.fieldMapCount + 1 }
              : s,
          ),
        );
        toast("Field mapping added");
      },
      updateFieldMap: (id, patch) => {
        setFieldMaps((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
        toast("Field mapping updated");
      },
      updateReviewItem: (id, patch) => {
        setReviewQueue((prev) =>
          prev.map((r) => {
            if (r.id !== id || r.status !== "pending") return r;
            const normalizedCi = {
              ...r.normalizedCi,
              ...(patch.name !== undefined ? { name: patch.name } : {}),
              ...(patch.className !== undefined ? { class: patch.className } : {}),
              ...(patch.matchKeys !== undefined ? { matchKeys: patch.matchKeys } : {}),
              ...(patch.attributes !== undefined ? { attributes: patch.attributes } : {}),
            };
            return {
              ...r,
              normalizedCi,
              ...(patch.confidence !== undefined ? { confidence: patch.confidence } : {}),
              ...(patch.matchCiId !== undefined ? { matchCiId: patch.matchCiId } : {}),
              ...(patch.matchCiName !== undefined ? { matchCiName: patch.matchCiName } : {}),
            };
          }),
        );
      },
      approveReviewItem: (id, patch) => {
        const base = reviewQueue.find((r) => r.id === id);
        if (!base || base.status !== "pending") return;

        const item: ReviewQueueItem = {
          ...base,
          confidence: patch?.confidence ?? base.confidence,
          matchCiId: patch?.matchCiId !== undefined ? patch.matchCiId : base.matchCiId,
          matchCiName: patch?.matchCiName !== undefined ? patch.matchCiName : base.matchCiName,
          normalizedCi: {
            ...base.normalizedCi,
            ...(patch?.name !== undefined ? { name: patch.name } : {}),
            ...(patch?.className !== undefined ? { class: patch.className } : {}),
            ...(patch?.matchKeys !== undefined ? { matchKeys: patch.matchKeys } : {}),
            ...(patch?.attributes !== undefined ? { attributes: patch.attributes } : {}),
          },
        };

        if (item.matchCiId) {
          setCis((prev) =>
            prev.map((c) => {
              if (c.id !== item.matchCiId) return c;
              return {
                ...c,
                attributes: {
                  ...c.attributes,
                  ...item.normalizedCi.matchKeys,
                  ...Object.fromEntries(
                    Object.entries(item.normalizedCi.attributes).map(([k, v]) => [
                      k,
                      typeof v === "string" || typeof v === "number" || typeof v === "boolean"
                        ? v
                        : String(v),
                    ]),
                  ),
                },
                updatedAt: new Date().toISOString(),
              };
            }),
          );
          setMergedToday((n) => n + 1);
          toast(`Merged into “${item.matchCiName ?? item.matchCiId}”`);
        } else {
          const cls =
            classes.find((c) => c.name === item.normalizedCi.class) ??
            classes.find((c) => c.displayName === item.normalizedCi.class) ??
            classes.find((c) => !c.isAbstract);
          const name =
            item.normalizedCi.name ??
            String(Object.values(item.normalizedCi.matchKeys)[0] ?? "discovered-ci");
          setCis((prev) => [
            {
              id: uid("ci"),
              classId: cls?.id ?? "ci-server",
              className: cls?.displayName ?? "Server",
              name,
              status: "discovered",
              environment: "production",
              parentCiId: null,
              attributes: {
                ...item.normalizedCi.matchKeys,
                ...Object.fromEntries(
                  Object.entries(item.normalizedCi.attributes).map(([k, v]) => [
                    k,
                    typeof v === "string" || typeof v === "number" || typeof v === "boolean"
                      ? v
                      : String(v),
                  ]),
                ),
              },
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          setCreatedToday((n) => n + 1);
          toast(`Created CI “${name}”`);
        }

        setReviewQueue((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  normalizedCi: item.normalizedCi,
                  confidence: item.confidence,
                  matchCiId: item.matchCiId,
                  matchCiName: item.matchCiName,
                  status: item.matchCiId ? "merged" : "created",
                }
              : r,
          ),
        );
      },
      rejectReviewItem: (id) => {
        setReviewQueue((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
        );
        toast("Discovery result rejected", "info");
      },
      addScanner: (input) => {
        setScanners((prev) => [
          {
            id: uid("scn"),
            name: input.name,
            adapterType: input.adapterType,
            config: { baseUrl: input.baseUrl },
            enabled: true,
            lastSyncAt: null,
            lastSyncStatus: "never",
          },
          ...prev,
        ]);
        toast(`Scanner “${input.name}” added`);
      },
      updateScanner: (id, patch) => {
        setScanners((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
        toast("Scanner updated");
      },
      testScanner: (id) => {
        const s = scanners.find((x) => x.id === id);
        toast(s ? `Connection test OK for “${s.name}”` : "Scanner not found");
      },
      syncScanner: (id) => {
        setScanners((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  lastSyncAt: new Date().toISOString(),
                  lastSyncStatus: "success",
                }
              : s,
          ),
        );
        const s = scanners.find((x) => x.id === id);
        toast(`Sync completed for “${s?.name ?? id}”`);
      },
      addTicket: (input) => {
        const ci = cis.find((c) => c.id === input.ciId);
        const exists = tickets.find((t) => t.cveId === input.cveId && t.ciId === input.ciId);
        if (exists) {
          toast("A ticket already exists for this CVE + CI", "error");
          return;
        }
        const num = `VULN-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(3, "0")}`;
        setTickets((prev) => [
          {
            id: uid("tkt"),
            ticketNumber: num,
            vulnGroupId: groups.find((g) => g.cveId === input.cveId)?.id ?? uid("grp"),
            cveId: input.cveId,
            ciId: input.ciId,
            ciName: ci?.name ?? "Unknown CI",
            findingId: findings.find((f) => f.cveId === input.cveId)?.id ?? "",
            title: input.title,
            severity: input.severity,
            status: "open",
            assigneeId: null,
            assigneeName: null,
            assignedTeam: null,
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            slaBreachAt: null,
            resolutionNotes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        toast(`Ticket ${num} created`);
      },
      updateTicketStatus: (id, status) => {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  updatedAt: new Date().toISOString(),
                  resolutionNotes:
                    status === "resolved" || status === "closed"
                      ? t.resolutionNotes ?? "Remediated via Nucleus UI"
                      : t.resolutionNotes,
                }
              : t,
          ),
        );
        toast(`Ticket status → ${status.replace(/_/g, " ")}`);
      },
      assignTicket: (id, assigneeName, assignedTeam) => {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  assigneeName,
                  assignedTeam: assignedTeam ?? t.assignedTeam,
                  status: t.status === "open" ? "assigned" : t.status,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );
        toast(`Assigned to ${assigneeName}`);
      },
      addRule: (input) => {
        setRules((prev) => [
          {
            id: uid("rule"),
            name: input.name,
            priority: input.priority,
            enabled: true,
            conditions: [{ field: "severity", op: "eq", value: input.severity }],
            actions: { assignedTeam: input.assignedTeam, setDueDays: 7 },
          },
          ...prev,
        ]);
        toast(`Rule “${input.name}” created`);
      },
      updateRule: (id, patch) => {
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        toast("Rule updated");
      },
      testRule: (id) => {
        const rule = rules.find((r) => r.id === id);
        if (!rule) return;
        const matches = tickets.filter((t) =>
          rule.conditions.every((c) => {
            if (c.field === "severity" && c.op === "eq") return t.severity === c.value;
            if (c.field === "severity" && c.op === "in" && Array.isArray(c.value))
              return c.value.includes(t.severity);
            return true;
          }),
        ).length;
        toast(`Rule “${rule.name}” would match ${matches} ticket(s)`, "info");
      },
      agentStats: () => ({
        agentCount: agents.length,
        enabledAgents: agents.filter((a) => a.enabled).length,
        pendingStaging: stagingItems.filter((s) => s.status === "pending").length,
        memoryCount: agentMemories.length,
        recentRuns: agentRuns.slice(0, 8),
      }),
      runAgent: (agentId, input = {}, provider) => {
        const ag = agents.find((a) => a.id === agentId);
        if (!ag) {
          toast("Agent not found", "error");
          return;
        }
        if (!ag.enabled) {
          toast("Agent is disabled", "error");
          return;
        }
        const usedProvider = provider ?? ag.provider;
        const runId = uid("run");
        const now = new Date().toISOString();
        let summary = `Ran ${ag.name} via ${usedProvider}`;
        let output: Record<string, unknown> = { action: "completed" };
        let stagingId: string | null = null;

        if (ag.kind === "classification" || input.reprocessStaging === true) {
          // Re-scan pending staging with learned memory
          const pending = stagingItems.filter((s) => s.status === "pending");
          let matched = 0;
          const hitIds: string[] = [];
          setStagingItems((prev) =>
            prev.map((s) => {
              if (s.status !== "pending") return s;
              const hit = findMemoryForStaging(s, agentMemories);
              if (!hit?.resolvedClass) return s;
              matched += 1;
              hitIds.push(s.id);
              return {
                ...s,
                proposedClass: hit.resolvedClass,
                proposedCategory: hit.resolvedCategory ?? s.proposedCategory,
                proposedType: hit.resolvedType ?? s.proposedType,
                confidence: Math.max(s.confidence, 0.85),
                unknownReason: `Matched learned memory “${hit.pattern}” → ${hit.resolvedClass}`,
                agentRunId: runId,
              };
            }),
          );
          if (hitIds.length > 0) {
            setAgentMemories((prev) =>
              prev.map((m) =>
                hitIds.some((id) => {
                  const item = pending.find((p) => p.id === id);
                  return item ? findMemoryForStaging(item, [m])?.id === m.id : false;
                })
                  ? { ...m, hitCount: m.hitCount + 1, lastUsedAt: now }
                  : m,
              ),
            );
          }
          summary =
            matched > 0
              ? `Applied learned memory to ${matched} staging item(s) — review and promote`
              : "No staging items matched learned memory";
          output = { action: "reprocess_staging", matched };
        } else if (ag.kind === "discovery") {
          const host = String(
            (input.raw as Record<string, unknown> | undefined)?.hostname ??
              input.name ??
              `unknown-${Date.now().toString().slice(-4)}`,
          );
          const probe = {
            proposedName: host,
            proposedType: typeof input.typeHint === "string" ? input.typeHint : null,
            proposedCategory: typeof input.category === "string" ? input.category : null,
            attributes: (input.raw as Record<string, unknown>) ?? input,
            matchKeys: { hostname: host },
          };
          const memoryHit = findMemoryForStaging(probe, agentMemories);
          if (memoryHit?.resolvedClass) {
            summary = `Mapped ${host} to ${memoryHit.resolvedClass} via learned memory “${memoryHit.pattern}”`;
            output = { action: "classified", className: memoryHit.resolvedClass, host };
            setAgentMemories((prev) =>
              prev.map((m) =>
                m.id === memoryHit.id
                  ? { ...m, hitCount: m.hitCount + 1, lastUsedAt: now }
                  : m,
              ),
            );
            // Create CI directly when memory is confident
            const cls =
              classes.find((c) => c.name === memoryHit.resolvedClass) ??
              classes.find((c) => !c.isAbstract);
            setCis((prev) => [
              {
                id: uid("ci"),
                classId: cls?.id ?? "ci-server",
                className: cls?.displayName ?? memoryHit.resolvedClass!,
                name: host,
                status: "discovered",
                environment: "production",
                parentCiId: null,
                attributes: {
                  ...probe.attributes,
                  ...probe.matchKeys,
                  ...(memoryHit.resolvedCategory ? { category: memoryHit.resolvedCategory } : {}),
                  ...(memoryHit.resolvedType ? { type: memoryHit.resolvedType } : {}),
                },
                updatedAt: now,
              },
              ...prev,
            ]);
          } else {
            stagingId = uid("stg");
            setStagingItems((prev) => [
              {
                id: stagingId!,
                proposedName: host,
                proposedClass: null,
                proposedCategory: typeof input.category === "string" ? input.category : null,
                proposedType: typeof input.typeHint === "string" ? input.typeHint : null,
                unknownReason: "Unknown class/category/type — awaiting authorized confirmation",
                matchKeys: { hostname: host },
                attributes: (input.raw as Record<string, unknown>) ?? input,
                confidence: 0.25,
                status: "pending",
                agentRunId: runId,
                createdAt: now,
              },
              ...prev,
            ]);
            summary = `Parked unknown asset ${host} in staging for confirmation`;
            output = { action: "staged", stagingId, host };
          }
        } else if (ag.kind === "reporting") {
          const prompt = String(input.prompt ?? input.query ?? "Executive CMDB health summary");
          const classCounts = new Map<string, number>();
          for (const ci of cis) {
            classCounts.set(ci.className, (classCounts.get(ci.className) ?? 0) + 1);
          }
          const openTickets = tickets.filter((t) => !["closed", "verified"].includes(t.status));
          const report = generateBusinessReport(prompt, {
            totalCis: cis.length,
            activeCis: cis.filter((c) => c.status === "active").length,
            classBreakdown: [...classCounts.entries()]
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count),
            relationshipCount: relationships.length,
            pendingStaging: stagingItems.filter((s) => s.status === "pending").length,
            pendingReview: reviewQueue.filter((r) => r.status === "pending").length,
            memoryCount: agentMemories.length,
            openVulnTickets: openTickets.length,
            criticalVulnTickets: openTickets.filter((t) => t.severity === "critical").length,
            discoverySources: discoverySources.length,
            recentAgentRuns: agentRuns.length,
          });
          summary = `Generated report: ${report.title}`;
          output = { action: "report", title: report.title, content: report.content };
        } else if (ag.kind === "relationship") {
          summary = "Proposed relationship between matched CIs";
          output = {
            action: "propose_relationship",
            proposal: {
              sourceQuery: input.sourceQuery,
              targetQuery: input.targetQuery,
              relationshipType: input.relationshipType ?? "depends_on",
            },
          };
        } else {
          // Manage: also reprocess staging with memory
          const pending = stagingItems.filter((s) => s.status === "pending");
          let matched = 0;
          setStagingItems((prev) =>
            prev.map((s) => {
              if (s.status !== "pending") return s;
              const hit = findMemoryForStaging(s, agentMemories);
              if (!hit?.resolvedClass) return s;
              matched += 1;
              return {
                ...s,
                proposedClass: hit.resolvedClass,
                proposedCategory: hit.resolvedCategory ?? s.proposedCategory,
                proposedType: hit.resolvedType ?? s.proposedType,
                confidence: Math.max(s.confidence, 0.85),
                unknownReason: `Matched learned memory “${hit.pattern}” → ${hit.resolvedClass}`,
                agentRunId: runId,
              };
            }),
          );
          summary =
            matched > 0
              ? `Manage agent applied memory to ${matched}/${pending.length} staging item(s)`
              : `Manage agent scanned ${pending.length} staging item(s); no memory matches`;
          output = { action: "manage_summary", matched, pending: pending.length };
        }

        setAgentRuns((prev) => [
          {
            id: runId,
            agentId,
            agentName: ag.name,
            provider: usedProvider,
            status: "succeeded",
            summary,
            input,
            output,
            createdAt: now,
            finishedAt: now,
          },
          ...prev,
        ]);
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId
              ? { ...a, lastRunAt: now, lastRunStatus: "succeeded" }
              : a,
          ),
        );
        toast(summary);
      },
      updateStagingItem: (id, patch) => {
        setStagingItems((prev) =>
          prev.map((s) => {
            if (s.id !== id || s.status !== "pending") return s;
            return {
              ...s,
              ...(patch.proposedName !== undefined ? { proposedName: patch.proposedName } : {}),
              ...(patch.proposedClass !== undefined ? { proposedClass: patch.proposedClass } : {}),
              ...(patch.proposedCategory !== undefined
                ? { proposedCategory: patch.proposedCategory }
                : {}),
              ...(patch.proposedType !== undefined ? { proposedType: patch.proposedType } : {}),
              ...(patch.matchKeys !== undefined ? { matchKeys: patch.matchKeys } : {}),
              ...(patch.attributes !== undefined ? { attributes: patch.attributes } : {}),
              ...(patch.unknownReason !== undefined ? { unknownReason: patch.unknownReason } : {}),
              ...(patch.confidence !== undefined ? { confidence: patch.confidence } : {}),
            };
          }),
        );
      },
      confirmStaging: (id, input) => {
        const base = stagingItems.find((s) => s.id === id);
        if (!base || base.status !== "pending") {
          toast("Staging item not available", "error");
          return;
        }
        const item = {
          ...base,
          proposedName: input.name ?? base.proposedName,
          proposedClass: input.className,
          proposedCategory: input.category ?? base.proposedCategory,
          proposedType: input.typeHint ?? base.proposedType,
          matchKeys: input.matchKeys ?? base.matchKeys,
          attributes: input.attributes ?? base.attributes,
        };
        const cls =
          classes.find((c) => c.name === input.className || c.displayName === input.className) ??
          classes.find((c) => !c.isAbstract);
        const created = {
          id: uid("ci"),
          classId: cls?.id ?? "ci-server",
          className: cls?.displayName ?? input.className,
          name: item.proposedName,
          status: "discovered" as const,
          environment: "production" as const,
          parentCiId: null,
          attributes: {
            ...item.attributes,
            ...item.matchKeys,
            ...(input.category ? { category: input.category } : {}),
            ...(input.typeHint ? { type: input.typeHint } : {}),
          },
          updatedAt: new Date().toISOString(),
        };
        setCis((prev) => [created, ...prev]);
        const now = new Date().toISOString();
        const applyToSimilar = input.applyToSimilar !== false && input.remember !== false;
        const learned = buildMemoriesFromConfirmation({
          className: input.className,
          category: input.category,
          typeHint: input.typeHint,
          name: item.proposedName,
          attributes: item.attributes,
          matchKeys: item.matchKeys,
        });
        const newMemories: AgentMemoryItem[] =
          input.remember !== false
            ? learned.map((m) => ({
                ...m,
                id: uid("mem"),
                hitCount: 1,
                createdAt: now,
                lastUsedAt: now,
              }))
            : [];

        let similarCount = 0;
        setStagingItems((prev) =>
          prev.map((s) => {
            if (s.id === id) {
              return {
                ...s,
                proposedName: item.proposedName,
                proposedClass: input.className,
                proposedCategory: input.category ?? s.proposedCategory,
                proposedType: input.typeHint ?? s.proposedType,
                matchKeys: item.matchKeys,
                attributes: item.attributes,
                status: "promoted",
                confirmedClass: input.className,
                confirmedBy: "Admin User",
              };
            }
            if (!applyToSimilar || s.status !== "pending") return s;
            const hit = findMemoryForStaging(s, [
              ...newMemories,
              ...agentMemories,
            ]);
            // Also match when sharing type/category/vendor with the confirmed item
            const sameType =
              item.proposedType &&
              s.proposedType &&
              (s.proposedType.toLowerCase() === item.proposedType.toLowerCase() ||
                s.proposedType.toLowerCase().split(/[_-]/)[0] ===
                  item.proposedType.toLowerCase().split(/[_-]/)[0]);
            const sameVendor =
              item.attributes.vendor &&
              s.attributes.vendor &&
              String(s.attributes.vendor).toLowerCase() ===
                String(item.attributes.vendor).toLowerCase();
            const sameCategory =
              item.proposedCategory &&
              s.proposedCategory &&
              s.proposedCategory.toLowerCase() === item.proposedCategory.toLowerCase();

            if (!hit && !sameType && !(sameVendor && sameCategory) && !(sameVendor && sameType)) {
              return s;
            }
            similarCount += 1;
            return {
              ...s,
              proposedClass: input.className,
              proposedCategory: input.category ?? s.proposedCategory,
              proposedType: s.proposedType ?? input.typeHint ?? null,
              confidence: Math.max(s.confidence, 0.8),
              unknownReason: `Similar to “${item.proposedName}” — proposed from your confirmation`,
            };
          }),
        );

        if (newMemories.length > 0) {
          setAgentMemories((prev) => {
            const existing = new Set(prev.map((m) => `${m.pattern.toLowerCase()}::${m.resolvedClass}`));
            const fresh = newMemories.filter(
              (m) => !existing.has(`${m.pattern.toLowerCase()}::${m.resolvedClass}`),
            );
            // Bump hit counts for patterns that already exist
            const updated = prev.map((m) => {
              const again = newMemories.find(
                (n) =>
                  n.pattern.toLowerCase() === m.pattern.toLowerCase() &&
                  n.resolvedClass === m.resolvedClass,
              );
              return again
                ? {
                    ...m,
                    hitCount: m.hitCount + 1,
                    lastUsedAt: now,
                    resolvedCategory: again.resolvedCategory ?? m.resolvedCategory,
                    resolvedType: again.resolvedType ?? m.resolvedType,
                  }
                : m;
            });
            return [...fresh, ...updated];
          });
        }

        toast(
          similarCount > 0
            ? `Promoted “${item.proposedName}” and proposed class on ${similarCount} similar staging item(s)`
            : `Promoted “${item.proposedName}” and stored learning — rerun Classification to apply to new items`,
        );
      },
      reprocessStagingWithMemory: (opts) => {
        const now = new Date().toISOString();
        const promoteMatches = opts?.promoteMatches === true;
        const pending = stagingItems.filter((s) => s.status === "pending");
        let matched = 0;
        let promoted = 0;
        const toPromote: StagingItem[] = [];

        setStagingItems((prev) =>
          prev.map((s) => {
            if (s.status !== "pending") return s;
            const hit = findMemoryForStaging(s, agentMemories);
            if (!hit?.resolvedClass) return s;
            matched += 1;
            if (promoteMatches) {
              promoted += 1;
              toPromote.push({
                ...s,
                proposedClass: hit.resolvedClass,
                proposedCategory: hit.resolvedCategory ?? s.proposedCategory,
                proposedType: hit.resolvedType ?? s.proposedType,
              });
              return {
                ...s,
                proposedClass: hit.resolvedClass,
                proposedCategory: hit.resolvedCategory ?? s.proposedCategory,
                proposedType: hit.resolvedType ?? s.proposedType,
                confidence: 0.9,
                status: "promoted",
                confirmedClass: hit.resolvedClass,
                confirmedBy: "Agent memory",
                unknownReason: `Auto-promoted from memory “${hit.pattern}”`,
              };
            }
            return {
              ...s,
              proposedClass: hit.resolvedClass,
              proposedCategory: hit.resolvedCategory ?? s.proposedCategory,
              proposedType: hit.resolvedType ?? s.proposedType,
              confidence: Math.max(s.confidence, 0.85),
              unknownReason: `Matched learned memory “${hit.pattern}” → ${hit.resolvedClass}`,
            };
          }),
        );

        if (promoteMatches && toPromote.length > 0) {
          setCis((prev) => [
            ...toPromote.map((item) => {
              const cls =
                classes.find((c) => c.name === item.proposedClass) ??
                classes.find((c) => !c.isAbstract);
              return {
                id: uid("ci"),
                classId: cls?.id ?? "ci-server",
                className: cls?.displayName ?? item.proposedClass ?? "Server",
                name: item.proposedName,
                status: "discovered" as const,
                environment: "production" as const,
                parentCiId: null,
                attributes: {
                  ...item.attributes,
                  ...item.matchKeys,
                  ...(item.proposedCategory ? { category: item.proposedCategory } : {}),
                  ...(item.proposedType ? { type: item.proposedType } : {}),
                },
                updatedAt: now,
              };
            }),
            ...prev,
          ]);
        }

        const agentId = opts?.agentId ?? "agt-classification";
        const ag = agents.find((a) => a.id === agentId) ?? agents.find((a) => a.kind === "classification");
        if (ag) {
          setAgentRuns((prev) => [
            {
              id: uid("run"),
              agentId: ag.id,
              agentName: ag.name,
              provider: ag.provider,
              status: "succeeded",
              summary:
                matched === 0
                  ? "Reprocess: no staging items matched memory"
                  : promoteMatches
                    ? `Reprocess: promoted ${promoted} staging item(s) from memory`
                    : `Reprocess: proposed class on ${matched} staging item(s) from memory`,
              input: { reprocessStaging: true, promoteMatches },
              output: { action: "reprocess_staging", matched, promoted },
              createdAt: now,
              finishedAt: now,
            },
            ...prev,
          ]);
          setAgents((prev) =>
            prev.map((a) =>
              a.id === ag.id ? { ...a, lastRunAt: now, lastRunStatus: "succeeded" } : a,
            ),
          );
        }

        toast(
          matched === 0
            ? "No similar staging items matched learned memory"
            : promoteMatches
              ? `Promoted ${promoted} similar item(s) from memory`
              : `Updated ${matched} similar staging item(s) from memory — confirm to promote`,
        );
        return { matched, promoted };
      },
      rejectStaging: (id, reason) => {
        setStagingItems((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, status: "rejected", confirmedBy: "Admin User" }
              : s,
          ),
        );
        toast(reason ? `Rejected: ${reason}` : "Staging item rejected", "info");
      },
      bulkRejectStaging: (ids, reason) => {
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        setStagingItems((prev) =>
          prev.map((s) =>
            idSet.has(s.id) && s.status === "pending"
              ? { ...s, status: "rejected", confirmedBy: "Admin User" }
              : s,
          ),
        );
        toast(
          reason
            ? `Rejected ${ids.length} item(s): ${reason}`
            : `Rejected ${ids.length} staging item(s)`,
          "info",
        );
      },
      instructClassifyStaging: (ids, input) => {
        if (ids.length === 0) {
          toast("Select at least one staging item", "error");
          return;
        }
        const concrete = classes.filter((c) => !c.isAbstract);
        const parsed = parseClassifyInstructions(input.instructions, concrete);
        const className =
          input.className ||
          parsed.className ||
          concrete.find((c) => c.name === "cmdb_ci_server")?.name ||
          concrete[0]?.name;
        if (!className) {
          toast("Could not resolve a CI class from instructions", "error");
          return;
        }
        const category = input.category || parsed.category;
        const typeHint = input.typeHint || parsed.typeHint;
        const idSet = new Set(ids);
        const now = new Date().toISOString();
        const targets = stagingItems.filter((s) => idSet.has(s.id) && s.status === "pending");
        if (targets.length === 0) {
          toast("No pending staging items in selection", "error");
          return;
        }

        const runId = uid("run");
        setAgentRuns((prev) => [
          {
            id: runId,
            agentId: "agt-classification",
            agentName: "Classification Agent",
            provider: "claude",
            status: "succeeded",
            summary: input.promote
              ? `Classified and promoted ${targets.length} staging item(s) via instructions`
              : `Applied classification instructions to ${targets.length} staging item(s)`,
            input: {
              instructions: input.instructions,
              ids,
              className,
              category,
              typeHint,
              promote: !!input.promote,
            },
            output: { action: input.promote ? "bulk_promote" : "bulk_propose", count: targets.length },
            createdAt: now,
            finishedAt: now,
          },
          ...prev,
        ]);

        if (input.remember !== false) {
          const patterns = [
            typeHint,
            category,
            ...targets.flatMap((t) => [
              t.proposedType,
              t.proposedCategory,
              String(t.attributes.vendor ?? ""),
            ]),
          ].filter((p): p is string => !!p && String(p).trim().length > 0);
          const unique = [...new Set(patterns.map((p) => p.toLowerCase()))];
          setAgentMemories((prev) => [
            ...unique.map((pattern) => ({
              id: uid("mem"),
              kind: "class_mapping" as const,
              pattern,
              resolvedClass: className,
              resolvedCategory: category ?? null,
              resolvedType: typeHint ?? null,
              hitCount: 1,
              source: "bulk_instruct",
              createdBy: "Admin User",
              createdAt: now,
              lastUsedAt: now,
            })),
            ...prev,
          ]);
        }

        if (input.promote) {
          const cls =
            classes.find((c) => c.name === className || c.displayName === className) ??
            classes.find((c) => !c.isAbstract);
          setCis((prev) => [
            ...targets.map((item) => ({
              id: uid("ci"),
              classId: cls?.id ?? "ci-server",
              className: cls?.displayName ?? className,
              name: item.proposedName,
              status: "discovered" as const,
              environment: "production" as const,
              parentCiId: null,
              attributes: {
                ...item.attributes,
                ...item.matchKeys,
                ...(category ? { category } : {}),
                ...(typeHint ? { type: typeHint } : {}),
              },
              updatedAt: now,
            })),
            ...prev,
          ]);
          setStagingItems((prev) =>
            prev.map((s) =>
              idSet.has(s.id) && s.status === "pending"
                ? {
                    ...s,
                    proposedClass: className,
                    proposedCategory: category ?? s.proposedCategory,
                    proposedType: typeHint ?? s.proposedType,
                    confidence: 0.9,
                    status: "promoted",
                    confirmedClass: className,
                    confirmedBy: "Admin User",
                    agentRunId: runId,
                  }
                : s,
            ),
          );
          toast(`Promoted ${targets.length} asset(s) as ${className}`);
        } else {
          setStagingItems((prev) =>
            prev.map((s) =>
              idSet.has(s.id) && s.status === "pending"
                ? {
                    ...s,
                    proposedClass: className,
                    proposedCategory: category ?? s.proposedCategory,
                    proposedType: typeHint ?? s.proposedType,
                    confidence: Math.max(s.confidence, 0.75),
                    unknownReason: `Proposed from instructions: “${input.instructions.slice(0, 80)}”`,
                    agentRunId: runId,
                  }
                : s,
            ),
          );
          toast(`Updated ${targets.length} proposal(s) — review and confirm to promote`);
        }
      },
      toggleAgent: (id) => {
        setAgents((prev) =>
          prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        );
        toast("Agent updated");
      },
      updateAgentSchedule: (id, input) => {
        const now = new Date();
        setAgents((prev) =>
          prev.map((a) => {
            if (a.id !== id) return a;
            const scheduleEnabled =
              input.scheduleEnabled && input.scheduleCadence !== "manual";
            return {
              ...a,
              scheduleEnabled,
              scheduleCadence: input.scheduleCadence,
              scheduleCron:
                input.scheduleCadence === "cron"
                  ? (input.scheduleCron ?? a.scheduleCron ?? "0 */6 * * *")
                  : null,
              scheduleTimezone: input.scheduleTimezone ?? a.scheduleTimezone,
              nextRunAt: scheduleEnabled
                ? computeNextRunAt(
                    input.scheduleCadence,
                    now,
                    input.scheduleCron ?? a.scheduleCron,
                  )
                : null,
            };
          }),
        );
        toast(
          input.scheduleEnabled && input.scheduleCadence !== "manual"
            ? "Agent schedule saved"
            : "Agent schedule disabled",
        );
      },
      runDueAgentSchedules: () => {
        const now = new Date();
        const due = agents.filter(
          (a) =>
            a.enabled &&
            a.scheduleEnabled &&
            a.scheduleCadence !== "manual" &&
            a.nextRunAt &&
            new Date(a.nextRunAt).getTime() <= now.getTime(),
        );
        if (due.length === 0) return 0;

        const nowIso = now.toISOString();
        setAgents((prev) =>
          prev.map((a) => {
            const hit = due.find((d) => d.id === a.id);
            if (!hit) return a;
            return {
              ...a,
              lastRunAt: nowIso,
              lastRunStatus: "succeeded" as const,
              lastScheduledAt: nowIso,
              nextRunAt: computeNextRunAt(a.scheduleCadence, now, a.scheduleCron),
            };
          }),
        );

        setAgentRuns((prev) => [
          ...due.map((ag) => ({
            id: uid("run"),
            agentId: ag.id,
            agentName: ag.name,
            provider: ag.provider,
            status: "succeeded" as const,
            summary: `Scheduled run of ${ag.name} (${SCHEDULE_CADENCE_LABELS[ag.scheduleCadence]})`,
            input: { scheduled: true, cadence: ag.scheduleCadence },
            output: { action: "scheduled_run" },
            createdAt: nowIso,
            finishedAt: nowIso,
          })),
          ...prev,
        ]);

        // Discovery/classification scheduled runs stage a sample unknown for the backlog
        const stageAgents = due.filter(
          (a) => a.kind === "discovery" || a.kind === "classification",
        );
        if (stageAgents.length > 0) {
          setStagingItems((prev) => [
            ...stageAgents.map((ag) => {
              const host = `sched-${ag.kind}-${Date.now().toString().slice(-5)}`;
              return {
                id: uid("stg"),
                proposedName: host,
                proposedClass: null as string | null,
                proposedCategory: null as string | null,
                proposedType: "scheduled_discovery",
                unknownReason: `Parked by scheduled ${ag.name} run`,
                matchKeys: { hostname: host },
                attributes: { source: "schedule", agentId: ag.id },
                confidence: 0.2,
                status: "pending" as const,
                agentRunId: null,
                createdAt: nowIso,
              };
            }),
            ...prev,
          ]);
        }

        toast(
          due.length === 1
            ? `Scheduled run completed: ${due[0].name}`
            : `${due.length} scheduled agent runs completed`,
        );
        return due.length;
      },
      updateSettings: (patch) => {
        setSettings((prev) => {
          const next = { ...prev, ...patch, agents: prev.agents };
          saveSettings(next);
          return next;
        });
        toast("Settings saved");
      },
      updateAgentSettings: (patch) => {
        setSettings((prev) => {
          const next = { ...prev, agents: { ...prev.agents, ...patch } };
          saveSettings(next);
          return next;
        });
        toast("Agent provider settings saved");
      },
      clearAgentApiKeys: () => {
        setSettings((prev) => {
          const next = {
            ...prev,
            agents: { ...prev.agents, anthropicApiKey: "", cursorApiKey: "" },
          };
          saveSettings(next);
          return next;
        });
        toast("API keys cleared", "info");
      },
      createReportThread: (title) => {
        const id = uid("rpt");
        const now = new Date().toISOString();
        const thread: ReportChatThread = {
          id,
          title: title?.trim() || "New report chat",
          messages: [
            {
              id: uid("msg"),
              role: "assistant",
              content:
                "I’m the Reporting Agent. Ask for an executive CMDB summary, discovery backlog briefing, vulnerability exposure pack, or inventory-by-class report for management.",
              createdAt: now,
            },
          ],
          updatedAt: now,
        };
        setReportThreads((prev) => [thread, ...prev]);
        setActiveReportThreadId(id);
        return id;
      },
      setActiveReportThread: (id) => setActiveReportThreadId(id),
      deleteReportThread: (id) => {
        setReportThreads((prev) => prev.filter((t) => t.id !== id));
        setActiveReportThreadId((cur) => (cur === id ? null : cur));
        toast("Report chat deleted", "info");
      },
      sendReportMessage: (prompt, threadId) => {
        const text = prompt.trim();
        if (!text) return;
        const now = new Date().toISOString();
        const tid = threadId ?? activeReportThreadId ?? uid("rpt");
        const isNew = !reportThreads.some((t) => t.id === tid);

        const classCounts = new Map<string, number>();
        for (const ci of cis) {
          classCounts.set(ci.className, (classCounts.get(ci.className) ?? 0) + 1);
        }
        const classBreakdown = [...classCounts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        const openTickets = tickets.filter((t) => !["closed", "verified"].includes(t.status));
        const report = generateBusinessReport(text, {
          totalCis: cis.length,
          activeCis: cis.filter((c) => c.status === "active").length,
          classBreakdown,
          relationshipCount: relationships.length,
          pendingStaging: stagingItems.filter((s) => s.status === "pending").length,
          pendingReview: reviewQueue.filter((r) => r.status === "pending").length,
          memoryCount: agentMemories.length,
          openVulnTickets: openTickets.length,
          criticalVulnTickets: openTickets.filter((t) => t.severity === "critical").length,
          discoverySources: discoverySources.length,
          recentAgentRuns: agentRuns.length,
        });

        const userMsg = {
          id: uid("msg"),
          role: "user" as const,
          content: text,
          createdAt: now,
        };
        const assistantMsg = {
          id: uid("msg"),
          role: "assistant" as const,
          content: report.content,
          createdAt: now,
          reportTitle: report.title,
        };

        setReportThreads((prev) => {
          if (isNew || !prev.some((t) => t.id === tid)) {
            return [
              {
                id: tid,
                title: text.slice(0, 48) || "New report chat",
                messages: [userMsg, assistantMsg],
                updatedAt: now,
              },
              ...prev,
            ];
          }
          return prev.map((t) =>
            t.id === tid
              ? {
                  ...t,
                  title: t.messages.length <= 1 ? text.slice(0, 48) : t.title,
                  messages: [...t.messages, userMsg, assistantMsg],
                  updatedAt: now,
                }
              : t,
          );
        });
        setActiveReportThreadId(tid);

        const reportingAgent = agents.find((a) => a.kind === "reporting");
        if (reportingAgent) {
          setAgentRuns((prev) => [
            {
              id: uid("run"),
              agentId: reportingAgent.id,
              agentName: reportingAgent.name,
              provider: reportingAgent.provider,
              status: "succeeded",
              summary: `Generated report: ${report.title}`,
              input: { prompt: text },
              output: { action: "report", title: report.title },
              createdAt: now,
              finishedAt: now,
            },
            ...prev,
          ]);
          setAgents((prev) =>
            prev.map((a) =>
              a.id === reportingAgent.id
                ? { ...a, lastRunAt: now, lastRunStatus: "succeeded" }
                : a,
            ),
          );
        }
      },
    }),
    [
      cis,
      classes,
      fields,
      relationships,
      discoverySources,
      fieldMaps,
      fieldAliases,
      reviewQueue,
      scanners,
      findings,
      groups,
      tickets,
      rules,
      agents,
      agentRuns,
      stagingItems,
      agentMemories,
      settings,
      reportThreads,
      activeReportThreadId,
      toasts,
      notifications,
      toast,
      dismissToast,
      getCiById,
      getFieldsForClass,
      getRelationshipsForCi,
      buildClassTree,
      mergedToday,
      createdToday,
    ],
  );

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const tick = () => valueRef.current.runDueAgentSchedules();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <AppStoreContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
