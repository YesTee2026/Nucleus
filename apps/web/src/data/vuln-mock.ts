export type VulnSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingStatus = "active" | "remediated" | "false_positive";
export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "verified"
  | "closed"
  | "exception"
  | "risk_accepted";
export type ScannerAdapterType =
  | "trivy"
  | "openvas"
  | "tenable"
  | "qualys"
  | "rapid7"
  | "webhook";
export type SyncStatus = "success" | "failed" | "running" | "never";

export interface ScannerConnection {
  id: string;
  name: string;
  adapterType: ScannerAdapterType;
  config: Record<string, string>;
  enabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: SyncStatus;
}

export interface VulnFinding {
  id: string;
  scannerConnectionId: string;
  scannerName: string;
  externalId: string;
  ciId: string | null;
  ciName: string | null;
  cveId: string;
  title: string;
  description: string;
  severity: VulnSeverity;
  cvssScore: number;
  packageName: string | null;
  installedVersion: string | null;
  fixedVersion: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  status: FindingStatus;
}

export interface VulnGroup {
  id: string;
  cveId: string;
  title: string;
  maxSeverity: VulnSeverity;
  cvssScore: number;
  affectedCiCount: number;
  openTicketCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface VulnTicket {
  id: string;
  ticketNumber: string;
  vulnGroupId: string;
  cveId: string;
  ciId: string;
  ciName: string;
  findingId: string;
  title: string;
  severity: VulnSeverity;
  status: TicketStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  assignedTeam: string | null;
  dueDate: string;
  slaBreachAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleCondition {
  field: string;
  op: "eq" | "neq" | "in" | "gte" | "lte" | "contains";
  value: string | number | string[];
}

export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: {
    assigneeId?: string;
    assigneeName?: string;
    assignedTeam?: string;
    setDueDays?: number;
  };
  createdBy: string;
}

export interface VulnDashboardStats {
  openTickets: number;
  bySeverity: Record<VulnSeverity, number>;
  slaAtRisk: number;
  slaBreached: number;
  activeFindings: number;
  topCves: { cveId: string; title: string; affectedCiCount: number; maxSeverity: VulnSeverity }[];
  lastScannerSync: { name: string; status: SyncStatus; at: string | null }[];
}

export const scannerConnections: ScannerConnection[] = [
  {
    id: "scan-1",
    name: "Production Trivy Server",
    adapterType: "trivy",
    config: { baseUrl: "https://trivy.internal:8080" },
    enabled: true,
    lastSyncAt: "2026-06-29T06:00:00Z",
    lastSyncStatus: "success",
  },
  {
    id: "scan-2",
    name: "Tenable Nessus Enterprise",
    adapterType: "tenable",
    config: { baseUrl: "https://nessus.corp.local" },
    enabled: true,
    lastSyncAt: "2026-06-28T22:00:00Z",
    lastSyncStatus: "success",
  },
  {
    id: "scan-3",
    name: "Qualys VMDR",
    adapterType: "qualys",
    config: { baseUrl: "https://qualysapi.qg2.apps.qualys.com" },
    enabled: true,
    lastSyncAt: "2026-06-29T02:00:00Z",
    lastSyncStatus: "success",
  },
  {
    id: "scan-4",
    name: "OpenVAS GVM",
    adapterType: "openvas",
    config: { baseUrl: "https://openvas.internal:9392" },
    enabled: false,
    lastSyncAt: "2026-06-20T10:00:00Z",
    lastSyncStatus: "failed",
  },
  {
    id: "scan-5",
    name: "Generic Webhook Ingest",
    adapterType: "webhook",
    config: { endpoint: "/api/v1/vuln/webhook/scan-5" },
    enabled: true,
    lastSyncAt: "2026-06-29T07:30:00Z",
    lastSyncStatus: "success",
  },
];

export const vulnGroups: VulnGroup[] = [
  {
    id: "grp-1",
    cveId: "CVE-2024-21762",
    title: "Fortinet FortiOS out-of-bound write",
    maxSeverity: "critical",
    cvssScore: 9.8,
    affectedCiCount: 3,
    openTicketCount: 3,
    firstSeenAt: "2026-06-15T08:00:00Z",
    lastSeenAt: "2026-06-29T06:00:00Z",
  },
  {
    id: "grp-2",
    cveId: "CVE-2023-48795",
    title: "Terrapin SSH vulnerability",
    maxSeverity: "high",
    cvssScore: 7.5,
    affectedCiCount: 4,
    openTicketCount: 4,
    firstSeenAt: "2026-06-10T12:00:00Z",
    lastSeenAt: "2026-06-29T06:00:00Z",
  },
  {
    id: "grp-3",
    cveId: "CVE-2024-1086",
    title: "Linux kernel use-after-free",
    maxSeverity: "high",
    cvssScore: 7.8,
    affectedCiCount: 2,
    openTicketCount: 2,
    firstSeenAt: "2026-06-18T09:00:00Z",
    lastSeenAt: "2026-06-28T22:00:00Z",
  },
  {
    id: "grp-4",
    cveId: "CVE-2024-3400",
    title: "Palo Alto PAN-OS command injection",
    maxSeverity: "critical",
    cvssScore: 10.0,
    affectedCiCount: 1,
    openTicketCount: 1,
    firstSeenAt: "2026-06-25T14:00:00Z",
    lastSeenAt: "2026-06-29T02:00:00Z",
  },
  {
    id: "grp-5",
    cveId: "CVE-2023-44487",
    title: "HTTP/2 Rapid Reset attack",
    maxSeverity: "medium",
    cvssScore: 5.3,
    affectedCiCount: 2,
    openTicketCount: 2,
    firstSeenAt: "2026-06-01T10:00:00Z",
    lastSeenAt: "2026-06-27T09:00:00Z",
  },
];

export const vulnFindings: VulnFinding[] = [
  {
    id: "find-1",
    scannerConnectionId: "scan-2",
    scannerName: "Tenable Nessus Enterprise",
    externalId: "tenable-88291",
    ciId: "ci-001",
    ciName: "web-prod-01",
    cveId: "CVE-2024-21762",
    title: "Fortinet FortiOS out-of-bound write",
    description: "Remote code execution via specially crafted HTTP requests.",
    severity: "critical",
    cvssScore: 9.8,
    packageName: "fortios",
    installedVersion: "7.2.4",
    fixedVersion: "7.2.6",
    firstSeenAt: "2026-06-15T08:00:00Z",
    lastSeenAt: "2026-06-29T06:00:00Z",
    status: "active",
  },
  {
    id: "find-2",
    scannerConnectionId: "scan-1",
    scannerName: "Production Trivy Server",
    externalId: "trivy-44210",
    ciId: "ci-001",
    ciName: "web-prod-01",
    cveId: "CVE-2023-48795",
    title: "Terrapin SSH vulnerability",
    description: "SSH protocol prefix truncation attack.",
    severity: "high",
    cvssScore: 7.5,
    packageName: "openssh",
    installedVersion: "9.3p1",
    fixedVersion: "9.6p1",
    firstSeenAt: "2026-06-10T12:00:00Z",
    lastSeenAt: "2026-06-29T06:00:00Z",
    status: "active",
  },
  {
    id: "find-3",
    scannerConnectionId: "scan-2",
    scannerName: "Tenable Nessus Enterprise",
    externalId: "tenable-88292",
    ciId: "ci-004",
    ciName: "db-prod-01",
    cveId: "CVE-2024-1086",
    title: "Linux kernel use-after-free",
    description: "Local privilege escalation in netfilter.",
    severity: "high",
    cvssScore: 7.8,
    packageName: "linux-kernel",
    installedVersion: "6.1.0-18",
    fixedVersion: "6.1.0-22",
    firstSeenAt: "2026-06-18T09:00:00Z",
    lastSeenAt: "2026-06-28T22:00:00Z",
    status: "active",
  },
  {
    id: "find-4",
    scannerConnectionId: "scan-3",
    scannerName: "Qualys VMDR",
    externalId: "qualys-99102",
    ciId: "ci-002",
    ciName: "orders-db-primary",
    cveId: "CVE-2024-1086",
    title: "Linux kernel use-after-free",
    description: "Local privilege escalation in netfilter.",
    severity: "high",
    cvssScore: 7.8,
    packageName: "linux-kernel",
    installedVersion: "6.1.0-18",
    fixedVersion: "6.1.0-22",
    firstSeenAt: "2026-06-18T09:00:00Z",
    lastSeenAt: "2026-06-29T02:00:00Z",
    status: "active",
  },
  {
    id: "find-5",
    scannerConnectionId: "scan-3",
    scannerName: "Qualys VMDR",
    externalId: "qualys-99103",
    ciId: "ci-005",
    ciName: "core-switch-01",
    cveId: "CVE-2024-3400",
    title: "Palo Alto PAN-OS command injection",
    description: "Unauthenticated command injection in GlobalProtect.",
    severity: "critical",
    cvssScore: 10.0,
    packageName: "pan-os",
    installedVersion: "11.0.2",
    fixedVersion: "11.0.4-h1",
    firstSeenAt: "2026-06-25T14:00:00Z",
    lastSeenAt: "2026-06-29T02:00:00Z",
    status: "active",
  },
  {
    id: "find-6",
    scannerConnectionId: "scan-1",
    scannerName: "Production Trivy Server",
    externalId: "trivy-44211",
    ciId: "ci-003",
    ciName: "Order Portal",
    cveId: "CVE-2023-44487",
    title: "HTTP/2 Rapid Reset attack",
    description: "Denial of service via HTTP/2 stream cancellation.",
    severity: "medium",
    cvssScore: 5.3,
    packageName: "nginx",
    installedVersion: "1.24.0",
    fixedVersion: "1.25.3",
    firstSeenAt: "2026-06-01T10:00:00Z",
    lastSeenAt: "2026-06-27T09:00:00Z",
    status: "active",
  },
  {
    id: "find-7",
    scannerConnectionId: "scan-2",
    scannerName: "Tenable Nessus Enterprise",
    externalId: "tenable-88293",
    ciId: "ci-004",
    ciName: "db-prod-01",
    cveId: "CVE-2023-48795",
    title: "Terrapin SSH vulnerability",
    description: "SSH protocol prefix truncation attack.",
    severity: "high",
    cvssScore: 7.5,
    packageName: "openssh",
    installedVersion: "9.3p1",
    fixedVersion: "9.6p1",
    firstSeenAt: "2026-06-10T12:00:00Z",
    lastSeenAt: "2026-06-28T22:00:00Z",
    status: "active",
  },
  {
    id: "find-8",
    scannerConnectionId: "scan-1",
    scannerName: "Production Trivy Server",
    externalId: "trivy-44212",
    ciId: null,
    ciName: null,
    cveId: "CVE-2024-21762",
    title: "Fortinet FortiOS out-of-bound write",
    description: "Unmatched asset pending CI review.",
    severity: "critical",
    cvssScore: 9.8,
    packageName: "fortios",
    installedVersion: "7.2.4",
    fixedVersion: "7.2.6",
    firstSeenAt: "2026-06-28T10:00:00Z",
    lastSeenAt: "2026-06-29T06:00:00Z",
    status: "active",
  },
  {
    id: "find-9",
    scannerConnectionId: "scan-2",
    scannerName: "Tenable Nessus Enterprise",
    externalId: "tenable-88294",
    ciId: "ci-004",
    ciName: "db-prod-01",
    cveId: "CVE-2024-21762",
    title: "Fortinet FortiOS out-of-bound write",
    description: "Remote code execution via specially crafted HTTP requests.",
    severity: "critical",
    cvssScore: 9.8,
    packageName: "fortios",
    installedVersion: "7.2.4",
    fixedVersion: "7.2.6",
    firstSeenAt: "2026-06-16T08:00:00Z",
    lastSeenAt: "2026-06-29T06:00:00Z",
    status: "active",
  },
  {
    id: "find-10",
    scannerConnectionId: "scan-1",
    scannerName: "Production Trivy Server",
    externalId: "trivy-44213",
    ciId: "ci-007",
    ciName: "web-staging-01",
    cveId: "CVE-2024-21762",
    title: "Fortinet FortiOS out-of-bound write",
    description: "Remote code execution via specially crafted HTTP requests.",
    severity: "critical",
    cvssScore: 9.8,
    packageName: "fortios",
    installedVersion: "7.2.4",
    fixedVersion: "7.2.6",
    firstSeenAt: "2026-06-20T08:00:00Z",
    lastSeenAt: "2026-06-29T06:00:00Z",
    status: "active",
  },
  {
    id: "find-11",
    scannerConnectionId: "scan-2",
    scannerName: "Tenable Nessus Enterprise",
    externalId: "tenable-88295",
    ciId: "ci-002",
    ciName: "orders-db-primary",
    cveId: "CVE-2023-48795",
    title: "Terrapin SSH vulnerability",
    description: "SSH protocol prefix truncation attack.",
    severity: "high",
    cvssScore: 7.5,
    packageName: "openssh",
    installedVersion: "9.3p1",
    fixedVersion: "9.6p1",
    firstSeenAt: "2026-06-11T12:00:00Z",
    lastSeenAt: "2026-06-28T22:00:00Z",
    status: "active",
  },
  {
    id: "find-12",
    scannerConnectionId: "scan-1",
    scannerName: "Production Trivy Server",
    externalId: "trivy-44214",
    ciId: "ci-007",
    ciName: "web-staging-01",
    cveId: "CVE-2023-48795",
    title: "Terrapin SSH vulnerability",
    description: "SSH protocol prefix truncation attack.",
    severity: "high",
    cvssScore: 7.5,
    packageName: "openssh",
    installedVersion: "9.3p1",
    fixedVersion: "9.6p1",
    firstSeenAt: "2026-06-12T12:00:00Z",
    lastSeenAt: "2026-06-29T06:00:00Z",
    status: "active",
  },
  {
    id: "find-13",
    scannerConnectionId: "scan-1",
    scannerName: "Production Trivy Server",
    externalId: "trivy-44215",
    ciId: "ci-001",
    ciName: "web-prod-01",
    cveId: "CVE-2023-44487",
    title: "HTTP/2 Rapid Reset attack",
    description: "Denial of service via HTTP/2 stream cancellation.",
    severity: "medium",
    cvssScore: 5.3,
    packageName: "nginx",
    installedVersion: "1.24.0",
    fixedVersion: "1.25.3",
    firstSeenAt: "2026-06-02T10:00:00Z",
    lastSeenAt: "2026-06-27T09:00:00Z",
    status: "active",
  },
];

export const vulnTickets: VulnTicket[] = [
  {
    id: "tkt-1",
    ticketNumber: "VUL-2026-00142",
    vulnGroupId: "grp-1",
    cveId: "CVE-2024-21762",
    ciId: "ci-001",
    ciName: "web-prod-01",
    findingId: "find-1",
    title: "CVE-2024-21762 on web-prod-01",
    severity: "critical",
    status: "in_progress",
    assigneeId: "user-1",
    assigneeName: "Sarah Chen",
    assignedTeam: "Security Ops",
    dueDate: "2026-07-06T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-15T08:30:00Z",
    updatedAt: "2026-06-28T14:00:00Z",
  },
  {
    id: "tkt-2",
    ticketNumber: "VUL-2026-00143",
    vulnGroupId: "grp-2",
    cveId: "CVE-2023-48795",
    ciId: "ci-001",
    ciName: "web-prod-01",
    findingId: "find-2",
    title: "CVE-2023-48795 on web-prod-01",
    severity: "high",
    status: "assigned",
    assigneeId: "user-2",
    assigneeName: "Mike Torres",
    assignedTeam: "Infrastructure",
    dueDate: "2026-07-15T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-10T13:00:00Z",
    updatedAt: "2026-06-26T10:00:00Z",
  },
  {
    id: "tkt-3",
    ticketNumber: "VUL-2026-00158",
    vulnGroupId: "grp-3",
    cveId: "CVE-2024-1086",
    ciId: "ci-004",
    ciName: "db-prod-01",
    findingId: "find-3",
    title: "CVE-2024-1086 on db-prod-01",
    severity: "high",
    status: "open",
    assigneeId: null,
    assigneeName: null,
    assignedTeam: null,
    dueDate: "2026-07-10T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-18T09:30:00Z",
    updatedAt: "2026-06-18T09:30:00Z",
  },
  {
    id: "tkt-4",
    ticketNumber: "VUL-2026-00159",
    vulnGroupId: "grp-3",
    cveId: "CVE-2024-1086",
    ciId: "ci-002",
    ciName: "orders-db-primary",
    findingId: "find-4",
    title: "CVE-2024-1086 on orders-db-primary",
    severity: "high",
    status: "assigned",
    assigneeId: "user-2",
    assigneeName: "Mike Torres",
    assignedTeam: "Infrastructure",
    dueDate: "2026-07-10T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-18T10:00:00Z",
    updatedAt: "2026-06-20T11:00:00Z",
  },
  {
    id: "tkt-5",
    ticketNumber: "VUL-2026-00171",
    vulnGroupId: "grp-4",
    cveId: "CVE-2024-3400",
    ciId: "ci-005",
    ciName: "core-switch-01",
    findingId: "find-5",
    title: "CVE-2024-3400 on core-switch-01",
    severity: "critical",
    status: "in_progress",
    assigneeId: "user-1",
    assigneeName: "Sarah Chen",
    assignedTeam: "Security Ops",
    dueDate: "2026-07-02T00:00:00Z",
    slaBreachAt: "2026-07-02T00:00:00Z",
    resolutionNotes: null,
    createdAt: "2026-06-25T14:30:00Z",
    updatedAt: "2026-06-29T08:00:00Z",
  },
  {
    id: "tkt-6",
    ticketNumber: "VUL-2026-00089",
    vulnGroupId: "grp-5",
    cveId: "CVE-2023-44487",
    ciId: "ci-003",
    ciName: "Order Portal",
    findingId: "find-6",
    title: "CVE-2023-44487 on Order Portal",
    severity: "medium",
    status: "resolved",
    assigneeId: "user-3",
    assigneeName: "Alex Kim",
    assignedTeam: "App Dev",
    dueDate: "2026-07-20T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: "nginx upgraded to 1.25.3",
    createdAt: "2026-06-01T11:00:00Z",
    updatedAt: "2026-06-27T16:00:00Z",
  },
  {
    id: "tkt-7",
    ticketNumber: "VUL-2026-00172",
    vulnGroupId: "grp-1",
    cveId: "CVE-2024-21762",
    ciId: "ci-004",
    ciName: "db-prod-01",
    findingId: "find-9",
    title: "CVE-2024-21762 on db-prod-01",
    severity: "critical",
    status: "assigned",
    assigneeId: "user-1",
    assigneeName: "Sarah Chen",
    assignedTeam: "Security Ops",
    dueDate: "2026-07-06T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-16T09:00:00Z",
    updatedAt: "2026-06-25T10:00:00Z",
  },
  {
    id: "tkt-8",
    ticketNumber: "VUL-2026-00173",
    vulnGroupId: "grp-1",
    cveId: "CVE-2024-21762",
    ciId: "ci-007",
    ciName: "web-staging-01",
    findingId: "find-10",
    title: "CVE-2024-21762 on web-staging-01",
    severity: "critical",
    status: "open",
    assigneeId: null,
    assigneeName: null,
    assignedTeam: null,
    dueDate: "2026-07-06T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-20T09:00:00Z",
    updatedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "tkt-9",
    ticketNumber: "VUL-2026-00144",
    vulnGroupId: "grp-2",
    cveId: "CVE-2023-48795",
    ciId: "ci-004",
    ciName: "db-prod-01",
    findingId: "find-7",
    title: "CVE-2023-48795 on db-prod-01",
    severity: "high",
    status: "assigned",
    assigneeId: "user-2",
    assigneeName: "Mike Torres",
    assignedTeam: "Infrastructure",
    dueDate: "2026-07-15T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-10T14:00:00Z",
    updatedAt: "2026-06-22T11:00:00Z",
  },
  {
    id: "tkt-10",
    ticketNumber: "VUL-2026-00145",
    vulnGroupId: "grp-2",
    cveId: "CVE-2023-48795",
    ciId: "ci-002",
    ciName: "orders-db-primary",
    findingId: "find-11",
    title: "CVE-2023-48795 on orders-db-primary",
    severity: "high",
    status: "in_progress",
    assigneeId: "user-2",
    assigneeName: "Mike Torres",
    assignedTeam: "Infrastructure",
    dueDate: "2026-07-15T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-11T13:00:00Z",
    updatedAt: "2026-06-28T09:00:00Z",
  },
  {
    id: "tkt-11",
    ticketNumber: "VUL-2026-00146",
    vulnGroupId: "grp-2",
    cveId: "CVE-2023-48795",
    ciId: "ci-007",
    ciName: "web-staging-01",
    findingId: "find-12",
    title: "CVE-2023-48795 on web-staging-01",
    severity: "high",
    status: "open",
    assigneeId: null,
    assigneeName: null,
    assignedTeam: null,
    dueDate: "2026-07-20T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-12T13:00:00Z",
    updatedAt: "2026-06-12T13:00:00Z",
  },
  {
    id: "tkt-12",
    ticketNumber: "VUL-2026-00090",
    vulnGroupId: "grp-5",
    cveId: "CVE-2023-44487",
    ciId: "ci-001",
    ciName: "web-prod-01",
    findingId: "find-13",
    title: "CVE-2023-44487 on web-prod-01",
    severity: "medium",
    status: "assigned",
    assigneeId: "user-3",
    assigneeName: "Alex Kim",
    assignedTeam: "App Dev",
    dueDate: "2026-07-20T00:00:00Z",
    slaBreachAt: null,
    resolutionNotes: null,
    createdAt: "2026-06-02T11:00:00Z",
    updatedAt: "2026-06-15T14:00:00Z",
  },
];

export const assignmentRules: AssignmentRule[] = [
  {
    id: "rule-1",
    name: "Critical production → Security Ops",
    priority: 1,
    enabled: true,
    conditions: [
      { field: "severity", op: "in", value: ["critical", "high"] },
      { field: "ci.environment", op: "eq", value: "production" },
    ],
    actions: { assignedTeam: "Security Ops", setDueDays: 14 },
    createdBy: "admin",
  },
  {
    id: "rule-2",
    name: "Database CIs → Infrastructure",
    priority: 2,
    enabled: true,
    conditions: [{ field: "ci.className", op: "eq", value: "Database" }],
    actions: { assignedTeam: "Infrastructure", assigneeName: "Mike Torres", setDueDays: 21 },
    createdBy: "admin",
  },
  {
    id: "rule-3",
    name: "Critical CVSS ≥ 9 → 7-day SLA",
    priority: 3,
    enabled: true,
    conditions: [{ field: "finding.cvss_score", op: "gte", value: 9 }],
    actions: { assignedTeam: "Security Ops", setDueDays: 7 },
    createdBy: "admin",
  },
  {
    id: "rule-4",
    name: "Application tier → App Dev",
    priority: 4,
    enabled: false,
    conditions: [{ field: "ci.className", op: "eq", value: "Application" }],
    actions: { assignedTeam: "App Dev", setDueDays: 30 },
    createdBy: "admin",
  },
];

export const vulnDashboardStats: VulnDashboardStats = {
  openTickets: vulnTickets.filter((t) => !["closed", "verified", "resolved"].includes(t.status)).length,
  bySeverity: {
    critical: vulnTickets.filter((t) => t.severity === "critical" && t.status !== "closed").length,
    high: vulnTickets.filter((t) => t.severity === "high" && !["closed", "resolved"].includes(t.status)).length,
    medium: vulnTickets.filter((t) => t.severity === "medium" && !["closed", "resolved"].includes(t.status)).length,
    low: 0,
    info: 0,
  },
  slaAtRisk: 2,
  slaBreached: 1,
  activeFindings: vulnFindings.filter((f) => f.status === "active").length,
  topCves: vulnGroups.slice(0, 5).map((g) => ({
    cveId: g.cveId,
    title: g.title,
    affectedCiCount: g.affectedCiCount,
    maxSeverity: g.maxSeverity,
  })),
  lastScannerSync: scannerConnections
    .filter((s) => s.enabled)
    .map((s) => ({ name: s.name, status: s.lastSyncStatus, at: s.lastSyncAt })),
};

export function getFindingsForCi(ciId: string): VulnFinding[] {
  return vulnFindings.filter((f) => f.ciId === ciId);
}

export function getTicketsForCi(ciId: string): VulnTicket[] {
  return vulnTickets.filter((t) => t.ciId === ciId);
}

export function getTicketById(id: string): VulnTicket | undefined {
  return vulnTickets.find((t) => t.id === id);
}

export function getGroupByCve(cveId: string): VulnGroup | undefined {
  return vulnGroups.find((g) => g.cveId === cveId);
}

export function getFindingsForGroup(cveId: string): VulnFinding[] {
  return vulnFindings.filter((f) => f.cveId === cveId);
}

export function getTicketsForGroup(cveId: string): VulnTicket[] {
  return vulnTickets.filter((t) => t.cveId === cveId);
}

/** One CVE group maps to many tickets — exactly one ticket per affected configuration item. */
export function getTicketForCiAndCve(ciId: string, cveId: string): VulnTicket | undefined {
  return vulnTickets.find((t) => t.ciId === ciId && t.cveId === cveId);
}

export function getGroupTicketSummary(cveId: string) {
  const tickets = getTicketsForGroup(cveId);
  return {
    totalTickets: tickets.length,
    openTickets: tickets.filter((t) => !["closed", "verified", "resolved"].includes(t.status)).length,
    affectedCis: [...new Set(tickets.map((t) => t.ciId))].length,
  };
}

export const ADAPTER_LABELS: Record<ScannerAdapterType, string> = {
  trivy: "Trivy (OSS)",
  openvas: "OpenVAS / GVM (OSS)",
  tenable: "Tenable / Nessus",
  qualys: "Qualys VMDR",
  rapid7: "Rapid7 InsightVM",
  webhook: "Generic Webhook",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  verified: "Verified",
  closed: "Closed",
  exception: "Exception",
  risk_accepted: "Risk Accepted",
};
