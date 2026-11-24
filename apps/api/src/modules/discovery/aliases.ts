import { DEFAULT_FIELD_ALIASES } from "@nucleus/shared";

export type AliasMap = Map<string, string>;

export function buildAliasMap(dbAliases: { alias: string; targetField: string }[]): AliasMap {
  const map: AliasMap = new Map();

  for (const [target, aliases] of Object.entries(DEFAULT_FIELD_ALIASES)) {
    for (const alias of aliases) {
      map.set(alias.toLowerCase(), target);
    }
    map.set(target.toLowerCase(), target);
  }

  for (const row of dbAliases) {
    map.set(row.alias.toLowerCase(), row.targetField);
  }

  return map;
}

export function resolveFieldName(sourceField: string, aliasMap: AliasMap): string {
  const direct = aliasMap.get(sourceField.toLowerCase());
  if (direct) return direct;

  const leaf = sourceField.split(".").pop() ?? sourceField;
  return aliasMap.get(leaf.toLowerCase()) ?? leaf;
}
