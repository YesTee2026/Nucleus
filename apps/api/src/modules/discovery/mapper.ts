import type { FieldMapEntry, NormalizedCi } from "@nucleus/shared";
import type { AliasMap } from "./aliases.js";
import { resolveFieldName } from "./aliases.js";
import { applyTransform } from "./transforms.js";

export interface FieldMapRow extends FieldMapEntry {
  className?: string | null;
}

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(out, flattenObject(val as Record<string, unknown>, path));
    } else {
      out[path] = val;
      out[key] = val;
    }
  }
  return out;
}

const MATCH_KEY_FIELDS = new Set(["hostname", "serial_number", "mac_address", "ip_address"]);

export function mapRawToNormalizedCi(
  raw: Record<string, unknown>,
  fieldMaps: FieldMapRow[],
  aliasMap: AliasMap,
  defaultClass: string,
): NormalizedCi {
  const flat = flattenObject(raw);
  const mappedTargets = new Set<string>();
  const matchKeys: Record<string, string | number | boolean> = {};
  const attributes: Record<string, unknown> = {};
  let className = defaultClass;
  let name: string | undefined;
  let environment: NormalizedCi["environment"];

  for (const map of fieldMaps) {
    const rawVal = flat[map.sourceField] ?? flat[map.sourceField.toLowerCase()];
    if (rawVal === undefined) continue;

    const transformed = applyTransform(rawVal, map.transform, map.transformArg);
    mappedTargets.add(map.targetField);

    if (map.targetField === "class") {
      className = String(transformed);
    } else if (map.targetField === "name") {
      name = String(transformed);
    } else if (map.targetField === "environment") {
      environment = transformed as NormalizedCi["environment"];
    } else if (MATCH_KEY_FIELDS.has(map.targetField)) {
      matchKeys[map.targetField] = transformed as string | number | boolean;
    } else {
      attributes[map.targetField] = transformed;
    }
  }

  for (const [sourceField, rawVal] of Object.entries(flat)) {
    if (rawVal === null || rawVal === undefined) continue;
    const target = resolveFieldName(sourceField, aliasMap);
    if (mappedTargets.has(target)) continue;

    if (target === "class") {
      className = String(rawVal);
    } else if (target === "name") {
      name = String(rawVal);
    } else if (target === "environment") {
      environment = rawVal as NormalizedCi["environment"];
    } else if (MATCH_KEY_FIELDS.has(target)) {
      matchKeys[target] = rawVal as string | number | boolean;
    } else {
      attributes[target] = rawVal;
    }
  }

  if (!name && matchKeys.hostname) name = String(matchKeys.hostname);
  if (!name && matchKeys.serial_number) name = String(matchKeys.serial_number);

  return {
    class: className,
    name,
    environment,
    matchKeys,
    attributes,
  };
}
