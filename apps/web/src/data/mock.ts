export type CiStatus = "active" | "draft" | "retired" | "discovered";
export type Environment = "production" | "staging" | "development";

export interface CiClass {
  id: string;
  name: string;
  displayName: string;
  parentId: string | null;
  isAbstract: boolean;
  ciCount: number;
}

export interface FieldDefinition {
  id: string;
  classId: string;
  name: string;
  displayName: string;
  dataType: "string" | "number" | "boolean" | "date" | "enum" | "ip" | "reference";
  isRequired: boolean;
  isStandard: boolean;
  isDiscoveryKey: boolean;
}

export interface ConfigurationItem {
  id: string;
  classId: string;
  className: string;
  name: string;
  status: CiStatus;
  environment: Environment;
  parentCiId: string | null;
  attributes: Record<string, string | number | boolean>;
  updatedAt: string;
}

export interface RelationshipType {
  id: string;
  name: string;
  displayName: string;
}

export interface CiRelationship {
  id: string;
  sourceCiId: string;
  targetCiId: string;
  relationshipTypeId: string;
  relationshipTypeName: string;
}

export interface ActivityConflict {
  id: string;
  activityA: string;
  activityB: string;
  conflictType: "time_overlap" | "shared_ci" | "dependency_chain";
  severity: "blocking" | "warning" | "info";
  sharedCiName: string;
}

export interface DashboardStats {
  totalCis: number;
  activeCis: number;
  discoveredToday: number;
  openConflicts: number;
  classesDefined: number;
  relationships: number;
}

export const ciClasses: CiClass[] = [
  { id: "ci-root", name: "cmdb_ci", displayName: "Configuration Item", parentId: null, isAbstract: true, ciCount: 0 },
  { id: "ci-hw", name: "cmdb_ci_hardware", displayName: "Hardware", parentId: "ci-root", isAbstract: true, ciCount: 0 },
  { id: "ci-server", name: "cmdb_ci_server", displayName: "Server", parentId: "ci-hw", isAbstract: false, ciCount: 142 },
  { id: "ci-network", name: "cmdb_ci_network", displayName: "Network Device", parentId: "ci-hw", isAbstract: false, ciCount: 38 },
  { id: "ci-storage", name: "cmdb_ci_storage", displayName: "Storage", parentId: "ci-hw", isAbstract: false, ciCount: 24 },
  { id: "ci-sw", name: "cmdb_ci_software", displayName: "Software", parentId: "ci-root", isAbstract: true, ciCount: 0 },
  { id: "ci-os", name: "cmdb_ci_os", displayName: "Operating System", parentId: "ci-sw", isAbstract: false, ciCount: 128 },
  { id: "ci-db", name: "cmdb_ci_database", displayName: "Database", parentId: "ci-sw", isAbstract: false, ciCount: 56 },
  { id: "ci-app", name: "cmdb_ci_application", displayName: "Application", parentId: "ci-sw", isAbstract: false, ciCount: 89 },
  { id: "ci-svc", name: "cmdb_ci_service", displayName: "Service", parentId: "ci-root", isAbstract: true, ciCount: 0 },
  { id: "ci-biz", name: "cmdb_ci_business_service", displayName: "Business Service", parentId: "ci-svc", isAbstract: false, ciCount: 31 },
];

export const fieldDefinitions: FieldDefinition[] = [
  { id: "f1", classId: "ci-root", name: "name", displayName: "Name", dataType: "string", isRequired: true, isStandard: true, isDiscoveryKey: false },
  { id: "f2", classId: "ci-root", name: "description", displayName: "Description", dataType: "string", isRequired: false, isStandard: true, isDiscoveryKey: false },
  { id: "f3", classId: "ci-root", name: "environment", displayName: "Environment", dataType: "enum", isRequired: true, isStandard: true, isDiscoveryKey: false },
  { id: "f4", classId: "ci-root", name: "owner", displayName: "Owner", dataType: "string", isRequired: false, isStandard: true, isDiscoveryKey: false },
  { id: "f5", classId: "ci-server", name: "hostname", displayName: "Hostname", dataType: "string", isRequired: true, isStandard: true, isDiscoveryKey: true },
  { id: "f6", classId: "ci-server", name: "ip_address", displayName: "IP Address", dataType: "ip", isRequired: false, isStandard: true, isDiscoveryKey: true },
  { id: "f7", classId: "ci-server", name: "serial_number", displayName: "Serial Number", dataType: "string", isRequired: false, isStandard: true, isDiscoveryKey: true },
  { id: "f8", classId: "ci-server", name: "cpu_cores", displayName: "CPU Cores", dataType: "number", isRequired: false, isStandard: false, isDiscoveryKey: false },
  { id: "f9", classId: "ci-db", name: "version", displayName: "Version", dataType: "string", isRequired: true, isStandard: true, isDiscoveryKey: false },
  { id: "f10", classId: "ci-db", name: "port", displayName: "Port", dataType: "number", isRequired: false, isStandard: true, isDiscoveryKey: false },
];

export const configurationItems: ConfigurationItem[] = [
  {
    id: "ci-001",
    classId: "ci-server",
    className: "Server",
    name: "web-prod-01",
    status: "active",
    environment: "production",
    parentCiId: null,
    attributes: { hostname: "web-prod-01.corp.local", ip_address: "10.0.1.15", serial_number: "SN7829341", cpu_cores: 16 },
    updatedAt: "2026-06-28T14:32:00Z",
  },
  {
    id: "ci-002",
    classId: "ci-db",
    className: "Database",
    name: "orders-db-primary",
    status: "active",
    environment: "production",
    parentCiId: null,
    attributes: { version: "PostgreSQL 16.2", port: 5432 },
    updatedAt: "2026-06-27T09:15:00Z",
  },
  {
    id: "ci-003",
    classId: "ci-app",
    className: "Application",
    name: "Order Portal",
    status: "active",
    environment: "production",
    parentCiId: null,
    attributes: { version: "3.4.1", tier: "critical" },
    updatedAt: "2026-06-29T08:00:00Z",
  },
  {
    id: "ci-004",
    classId: "ci-server",
    className: "Server",
    name: "db-prod-01",
    status: "active",
    environment: "production",
    parentCiId: null,
    attributes: { hostname: "db-prod-01.corp.local", ip_address: "10.0.2.8", serial_number: "SN4410293", cpu_cores: 32 },
    updatedAt: "2026-06-26T16:45:00Z",
  },
  {
    id: "ci-005",
    classId: "ci-network",
    className: "Network Device",
    name: "core-switch-01",
    status: "active",
    environment: "production",
    parentCiId: null,
    attributes: { model: "Catalyst 9300", ip_address: "10.0.0.1" },
    updatedAt: "2026-06-25T11:20:00Z",
  },
  {
    id: "ci-006",
    classId: "ci-biz",
    className: "Business Service",
    name: "E-Commerce Platform",
    status: "active",
    environment: "production",
    parentCiId: null,
    attributes: { sla: "99.95%", owner: "Digital Commerce" },
    updatedAt: "2026-06-20T10:00:00Z",
  },
  {
    id: "ci-007",
    classId: "ci-server",
    className: "Server",
    name: "web-staging-01",
    status: "discovered",
    environment: "staging",
    parentCiId: null,
    attributes: { hostname: "web-staging-01.corp.local", ip_address: "10.1.1.15" },
    updatedAt: "2026-06-29T06:30:00Z",
  },
  {
    id: "ci-008",
    classId: "ci-app",
    className: "Application",
    name: "Payment Gateway",
    status: "active",
    environment: "production",
    parentCiId: null,
    attributes: { version: "2.1.0", tier: "critical" },
    updatedAt: "2026-06-28T12:00:00Z",
  },
];

export const relationshipTypes: RelationshipType[] = [
  { id: "rt-1", name: "runs_on", displayName: "Runs On" },
  { id: "rt-2", name: "depends_on", displayName: "Depends On" },
  { id: "rt-3", name: "hosts", displayName: "Hosts" },
  { id: "rt-4", name: "connects_to", displayName: "Connects To" },
  { id: "rt-5", name: "located_in", displayName: "Located In" },
  { id: "rt-6", name: "backed_by", displayName: "Backed By" },
];

export const ciRelationships: CiRelationship[] = [
  { id: "rel-1", sourceCiId: "ci-002", targetCiId: "ci-004", relationshipTypeId: "rt-1", relationshipTypeName: "Runs On" },
  { id: "rel-2", sourceCiId: "ci-003", targetCiId: "ci-002", relationshipTypeId: "rt-2", relationshipTypeName: "Depends On" },
  { id: "rel-3", sourceCiId: "ci-003", targetCiId: "ci-001", relationshipTypeId: "rt-1", relationshipTypeName: "Runs On" },
  { id: "rel-4", sourceCiId: "ci-001", targetCiId: "ci-005", relationshipTypeId: "rt-4", relationshipTypeName: "Connects To" },
  { id: "rel-5", sourceCiId: "ci-004", targetCiId: "ci-005", relationshipTypeId: "rt-4", relationshipTypeName: "Connects To" },
  { id: "rel-6", sourceCiId: "ci-008", targetCiId: "ci-003", relationshipTypeId: "rt-2", relationshipTypeName: "Depends On" },
  { id: "rel-7", sourceCiId: "ci-006", targetCiId: "ci-003", relationshipTypeId: "rt-2", relationshipTypeName: "Depends On" },
  { id: "rel-8", sourceCiId: "ci-006", targetCiId: "ci-008", relationshipTypeId: "rt-2", relationshipTypeName: "Depends On" },
];

export const activityConflicts: ActivityConflict[] = [
  {
    id: "conf-1",
    activityA: "DB Patch — orders-db-primary",
    activityB: "App Deploy — Order Portal",
    conflictType: "dependency_chain",
    severity: "blocking",
    sharedCiName: "orders-db-primary",
  },
  {
    id: "conf-2",
    activityA: "Network Maintenance — core-switch-01",
    activityB: "Server Reboot — web-prod-01",
    conflictType: "shared_ci",
    severity: "warning",
    sharedCiName: "core-switch-01",
  },
];

export const dashboardStats: DashboardStats = {
  totalCis: 508,
  activeCis: 487,
  discoveredToday: 12,
  openConflicts: 3,
  classesDefined: 11,
  relationships: 1247,
};

export function getCiById(id: string): ConfigurationItem | undefined {
  return configurationItems.find((ci) => ci.id === id);
}

export function getRelationshipsForCi(ciId: string): CiRelationship[] {
  return ciRelationships.filter((r) => r.sourceCiId === ciId || r.targetCiId === ciId);
}

export function getFieldsForClass(classId: string): FieldDefinition[] {
  const chain: string[] = [];
  let current = ciClasses.find((c) => c.id === classId);
  while (current) {
    chain.unshift(current.id);
    current = current.parentId ? ciClasses.find((c) => c.id === current!.parentId) : undefined;
  }
  const seen = new Set<string>();
  const fields: FieldDefinition[] = [];
  for (const id of chain) {
    for (const f of fieldDefinitions.filter((fd) => fd.classId === id)) {
      if (!seen.has(f.name)) {
        seen.add(f.name);
        fields.push(f);
      }
    }
  }
  return fields;
}

export interface ClassTreeNode extends CiClass {
  children: ClassTreeNode[];
}

export function buildClassTree(): ClassTreeNode[] {
  const map = new Map<string, ClassTreeNode>();
  for (const c of ciClasses) {
    map.set(c.id, { ...c, children: [] });
  }
  const roots: ClassTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
  }
  return roots;
}
