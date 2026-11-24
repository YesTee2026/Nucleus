export type DiscoverySourceType = "network_scan" | "script" | "webhook";
export type DiscoveryConfidence = "high" | "medium" | "low";
export type DiscoveryResultStatus = "pending" | "merged" | "created" | "rejected";
export type FieldTransform = "none" | "lowercase" | "uppercase" | "trim" | "regex" | "split" | "default";

export interface DiscoverySource {
  id: string;
  name: string;
  type: DiscoverySourceType;
  className: string;
  host: string;
  port: number;
  connectionString: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: string;
  fieldMapCount: number;
}

export const DEFAULT_PORTS: Record<DiscoverySourceType, number> = {
  network_scan: 22,
  script: 443,
  webhook: 443,
};

export function buildConnectionString(host: string, port: number, type: DiscoverySourceType): string {
  const h = host.trim();
  if (!h) return "";
  if (type === "webhook") return `https://${h}:${port}/hooks/discovery`;
  if (type === "script") return `https://${h}:${port}/api/v1`;
  return `${h}:${port}`;
}

export interface FieldMapEntry {
  id: string;
  discoverySourceId: string;
  sourceField: string;
  targetField: string;
  transform: FieldTransform;
  transformArg?: string;
}

export interface FieldAlias {
  id: string;
  alias: string;
  targetField: string;
}

export interface NormalizedCiPreview {
  class: string;
  name?: string;
  matchKeys: Record<string, string | number | boolean>;
  attributes: Record<string, unknown>;
}

export interface ReviewQueueItem {
  id: string;
  discoverySourceId: string;
  sourceName: string;
  normalizedCi: NormalizedCiPreview;
  matchCiId: string | null;
  matchCiName: string | null;
  confidence: DiscoveryConfidence;
  status: DiscoveryResultStatus;
  createdAt: string;
  rawPreview: Record<string, unknown>;
}

export const SOURCE_TYPE_LABELS: Record<DiscoverySourceType, string> = {
  network_scan: "Network Scan",
  script: "Custom Script",
  webhook: "Webhook",
};

export const TRANSFORM_LABELS: Record<FieldTransform, string> = {
  none: "None",
  lowercase: "Lowercase",
  uppercase: "Uppercase",
  trim: "Trim whitespace",
  regex: "Regex extract",
  split: "Split to array",
  default: "Default if empty",
};

export const CONFIDENCE_VARIANT: Record<DiscoveryConfidence, "success" | "warning" | "danger"> = {
  high: "success",
  medium: "warning",
  low: "danger",
};

export const discoverySources: DiscoverySource[] = [
  {
    id: "src-nmap",
    name: "DC Network Scan",
    type: "network_scan",
    className: "cmdb_ci_server",
    host: "10.0.0.10",
    port: 22,
    connectionString: "10.0.0.10:22",
    enabled: true,
    lastRunAt: "2026-06-28T06:00:00Z",
    lastRunStatus: "success",
    fieldMapCount: 6,
  },
  {
    id: "src-vmware",
    name: "VMware vCenter Script",
    type: "script",
    className: "cmdb_ci_server",
    host: "vcenter.corp.local",
    port: 443,
    connectionString: "https://vcenter.corp.local:443/api/v1",
    enabled: true,
    lastRunAt: "2026-06-29T02:30:00Z",
    lastRunStatus: "success",
    fieldMapCount: 8,
  },
  {
    id: "src-snmp",
    name: "SNMP Network Devices",
    type: "network_scan",
    className: "cmdb_ci_network",
    host: "10.0.0.1",
    port: 161,
    connectionString: "10.0.0.1:161",
    enabled: true,
    lastRunAt: "2026-06-27T18:00:00Z",
    lastRunStatus: "success",
    fieldMapCount: 5,
  },
  {
    id: "src-webhook",
    name: "Cloud Agent Webhook",
    type: "webhook",
    className: "cmdb_ci_server",
    host: "agents.corp.local",
    port: 443,
    connectionString: "https://agents.corp.local:443/hooks/discovery",
    enabled: false,
    lastRunAt: null,
    lastRunStatus: "never",
    fieldMapCount: 4,
  },
];

export const fieldMaps: FieldMapEntry[] = [
  { id: "fm-1", discoverySourceId: "src-nmap", sourceField: "HostName", targetField: "hostname", transform: "lowercase" },
  { id: "fm-2", discoverySourceId: "src-nmap", sourceField: "IPv4Address", targetField: "ip_address", transform: "trim" },
  { id: "fm-3", discoverySourceId: "src-nmap", sourceField: "MAC", targetField: "mac_address", transform: "uppercase" },
  { id: "fm-4", discoverySourceId: "src-nmap", sourceField: "OS", targetField: "os_name", transform: "none" },
  { id: "fm-5", discoverySourceId: "src-nmap", sourceField: "SerialNumber", targetField: "serial_number", transform: "trim" },
  { id: "fm-6", discoverySourceId: "src-nmap", sourceField: "Vendor", targetField: "manufacturer", transform: "none" },
  { id: "fm-7", discoverySourceId: "src-vmware", sourceField: "vm.name", targetField: "name", transform: "trim" },
  { id: "fm-8", discoverySourceId: "src-vmware", sourceField: "vm.guest.hostName", targetField: "hostname", transform: "lowercase" },
  { id: "fm-9", discoverySourceId: "src-vmware", sourceField: "vm.guest.ipAddress", targetField: "ip_address", transform: "trim" },
  { id: "fm-10", discoverySourceId: "src-vmware", sourceField: "vm.config.uuid", targetField: "serial_number", transform: "none" },
  { id: "fm-11", discoverySourceId: "src-snmp", sourceField: "sysName", targetField: "hostname", transform: "lowercase" },
  { id: "fm-12", discoverySourceId: "src-snmp", sourceField: "ip", targetField: "ip_address", transform: "none" },
];

export const fieldAliases: FieldAlias[] = [
  { id: "fa-1", alias: "fqdn", targetField: "hostname" },
  { id: "fa-2", alias: "dns_name", targetField: "hostname" },
  { id: "fa-3", alias: "ipv4", targetField: "ip_address" },
  { id: "fa-4", alias: "asset_tag", targetField: "serial_number" },
];

export const reviewQueue: ReviewQueueItem[] = [
  {
    id: "rq-1",
    discoverySourceId: "src-nmap",
    sourceName: "DC Network Scan",
    normalizedCi: {
      class: "cmdb_ci_server",
      name: "web-03.prod.local",
      matchKeys: { hostname: "web-03.prod.local", ip_address: "10.0.1.22" },
      attributes: { os_name: "Ubuntu 22.04", mac_address: "00:1A:2B:3C:4D:5E" },
    },
    matchCiId: "ci-003",
    matchCiName: "web-03",
    confidence: "medium",
    status: "pending",
    createdAt: "2026-06-29T08:15:00Z",
    rawPreview: { HostName: "web-03.prod.local", IPv4Address: "10.0.1.22", OS: "Ubuntu 22.04" },
  },
  {
    id: "rq-2",
    discoverySourceId: "src-vmware",
    sourceName: "VMware vCenter Script",
    normalizedCi: {
      class: "cmdb_ci_server",
      name: "db-replica-02",
      matchKeys: { serial_number: "vm-uuid-8821-aabb", hostname: "db-replica-02" },
      attributes: { ip_address: "10.0.2.45", cpu_count: 8, memory_gb: 32 },
    },
    matchCiId: null,
    matchCiName: null,
    confidence: "high",
    status: "pending",
    createdAt: "2026-06-29T07:42:00Z",
    rawPreview: { "vm.name": "db-replica-02", "vm.config.uuid": "vm-uuid-8821-aabb" },
  },
  {
    id: "rq-3",
    discoverySourceId: "src-snmp",
    sourceName: "SNMP Network Devices",
    normalizedCi: {
      class: "cmdb_ci_network",
      name: "core-sw-01",
      matchKeys: { hostname: "core-sw-01", ip_address: "10.0.0.1" },
      attributes: { manufacturer: "Cisco", model: "C9300-48P" },
    },
    matchCiId: "ci-net-01",
    matchCiName: "core-sw-01",
    confidence: "high",
    status: "pending",
    createdAt: "2026-06-29T06:30:00Z",
    rawPreview: { sysName: "core-sw-01", ip: "10.0.0.1" },
  },
  {
    id: "rq-4",
    discoverySourceId: "src-nmap",
    sourceName: "DC Network Scan",
    normalizedCi: {
      class: "cmdb_ci_server",
      name: "unknown-host-9912",
      matchKeys: { ip_address: "10.0.5.99" },
      attributes: { mac_address: "AA:BB:CC:DD:EE:FF" },
    },
    matchCiId: null,
    matchCiName: null,
    confidence: "low",
    status: "pending",
    createdAt: "2026-06-29T05:10:00Z",
    rawPreview: { IPv4Address: "10.0.5.99", MAC: "AA:BB:CC:DD:EE:FF" },
  },
];

export const discoveryDashboardStats = {
  sourceCount: discoverySources.length,
  enabledSources: discoverySources.filter((s) => s.enabled).length,
  pendingReview: reviewQueue.filter((r) => r.status === "pending").length,
  mergedToday: 12,
  createdToday: 5,
};

export const DEFAULT_FIELD_ALIASES: Record<string, string[]> = {
  hostname: ["host", "fqdn", "dns_name", "dnsname", "host_name", "HostName", "DNSName", "sysName"],
  ip_address: ["ip", "ipv4", "ipv4address", "IPv4Address", "address", "ipaddr", "IP"],
  serial_number: ["serial", "serialnumber", "serial_no", "asset_tag", "SerialNumber"],
  mac_address: ["mac", "macaddr", "MAC", "physical_address"],
  name: ["ci_name", "asset_name", "device_name"],
};

export const TARGET_FIELDS = [
  "name",
  "hostname",
  "ip_address",
  "serial_number",
  "mac_address",
  "os_name",
  "manufacturer",
  "model",
  "environment",
  "class",
];
