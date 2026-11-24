import { z } from "zod";

export const fieldTransformSchema = z.enum([
  "none",
  "lowercase",
  "uppercase",
  "trim",
  "regex",
  "split",
  "default",
]);

export type FieldTransform = z.infer<typeof fieldTransformSchema>;

export const fieldMapEntrySchema = z.object({
  sourceField: z.string().min(1),
  targetField: z.string().min(1),
  transform: fieldTransformSchema.default("none"),
  transformArg: z.string().optional(),
});

export const normalizedCiRelationshipSchema = z.object({
  type: z.string(),
  targetMatch: z.record(z.string()),
});

export const normalizedCiSchema = z.object({
  class: z.string().min(1),
  name: z.string().optional(),
  environment: z.enum(["production", "staging", "development"]).optional(),
  matchKeys: z.record(z.union([z.string(), z.number(), z.boolean()])),
  attributes: z.record(z.unknown()).default({}),
  relationships: z.array(normalizedCiRelationshipSchema).optional(),
});

export const canonicalDiscoveryPayloadSchema = z.object({
  cis: z.array(normalizedCiSchema).min(1),
});

export const rawDiscoveryPayloadSchema = z.object({
  raw: z.record(z.unknown()),
  class: z.string().optional(),
});

export const discoveryPayloadSchema = z.union([
  canonicalDiscoveryPayloadSchema,
  rawDiscoveryPayloadSchema,
  normalizedCiSchema,
]);

export const createDiscoverySourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["network_scan", "script", "webhook"]),
  classId: z.string().uuid().optional(),
  className: z.string().optional(),
  config: z.record(z.string()).default({}),
  enabled: z.boolean().default(true),
});

export const createFieldMapSchema = z.object({
  discoverySourceId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  className: z.string().optional(),
  mappings: z.array(fieldMapEntrySchema).min(1),
});

export const createFieldAliasSchema = z.object({
  alias: z.string().min(1),
  targetField: z.string().min(1),
});

export type NormalizedCi = z.infer<typeof normalizedCiSchema>;
export type CanonicalDiscoveryPayload = z.infer<typeof canonicalDiscoveryPayloadSchema>;
export type RawDiscoveryPayload = z.infer<typeof rawDiscoveryPayloadSchema>;
export type FieldMapEntry = z.infer<typeof fieldMapEntrySchema>;

export const DEFAULT_FIELD_ALIASES: Record<string, string[]> = {
  hostname: ["host", "fqdn", "dns_name", "dnsname", "host_name", "HostName", "DNSName"],
  ip_address: ["ip", "ipv4", "ipv4address", "IPv4Address", "address", "ipaddr", "IP"],
  serial_number: ["serial", "serialnumber", "serial_no", "asset_tag", "SerialNumber"],
  mac_address: ["mac", "macaddr", "MAC", "physical_address"],
  name: ["ci_name", "asset_name", "device_name"],
};
