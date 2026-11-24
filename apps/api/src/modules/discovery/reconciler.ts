import type { NormalizedCi } from "@nucleus/shared";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import {
  ciClass,
  ciFieldDefinition,
  configurationItem,
} from "../../db/schema/index.js";

export type DiscoveryConfidence = "high" | "medium" | "low";

export interface ReconcileResult {
  matchCiId: string | null;
  confidence: DiscoveryConfidence;
  matchedKeys: string[];
  missingKeys: string[];
  conflict: boolean;
}

export async function getDiscoveryKeyFields(
  db: Database,
  className: string,
): Promise<string[]> {
  const [cls] = await db.select().from(ciClass).where(eq(ciClass.name, className)).limit(1);
  if (!cls) {
    return ["hostname", "serial_number", "ip_address", "mac_address"];
  }

  const fields = await db
    .select()
    .from(ciFieldDefinition)
    .where(eq(ciFieldDefinition.classId, cls.id));

  const keys = fields.filter((f) => f.isDiscoveryKey).map((f) => f.name);
  return keys.length > 0 ? keys : ["hostname", "serial_number", "ip_address"];
}

export async function reconcileCi(
  db: Database,
  normalizedCi: NormalizedCi,
): Promise<ReconcileResult> {
  const discoveryKeys = await getDiscoveryKeyFields(db, normalizedCi.class);
  const presentKeys = discoveryKeys.filter((k) => normalizedCi.matchKeys[k] !== undefined);
  const missingKeys = discoveryKeys.filter((k) => normalizedCi.matchKeys[k] === undefined);

  if (presentKeys.length === 0) {
    return {
      matchCiId: null,
      confidence: "low",
      matchedKeys: [],
      missingKeys: discoveryKeys,
      conflict: false,
    };
  }

  const candidates = await db.select().from(configurationItem);
  const matches: { id: string; score: number; keys: string[] }[] = [];

  for (const ci of candidates) {
    const attrs = (ci.attributes ?? {}) as Record<string, unknown>;
    const matched: string[] = [];

    for (const key of presentKeys) {
      const incoming = String(normalizedCi.matchKeys[key]).toLowerCase();
      const existing = String(attrs[key] ?? "").toLowerCase();
      if (existing && incoming === existing) matched.push(key);
    }

    if (matched.length > 0) {
      matches.push({ id: ci.id, score: matched.length, keys: matched });
    }
  }

  // JSONB lookup for any single key hit
  if (matches.length === 0 && presentKeys.length > 0) {
    for (const key of presentKeys) {
      const val = String(normalizedCi.matchKeys[key]);
      const [row] = await db
        .select()
        .from(configurationItem)
        .where(sql`${configurationItem.attributes}->>${key} = ${val}`)
        .limit(1);
      if (row) {
        matches.push({ id: row.id, score: 1, keys: [key] });
        break;
      }
    }
  }

  if (matches.length === 0) {
    const confidence: DiscoveryConfidence =
      presentKeys.length >= discoveryKeys.length ? "medium" : "low";
    return {
      matchCiId: null,
      confidence,
      matchedKeys: [],
      missingKeys,
      conflict: false,
    };
  }

  matches.sort((a, b) => b.score - a.score);
  const best = matches[0];
  const conflict = matches.length > 1 && matches[1].score === best.score;

  let confidence: DiscoveryConfidence = "low";
  if (conflict) {
    confidence = "low";
  } else if (best.score >= discoveryKeys.length) {
    confidence = "high";
  } else if (best.score >= Math.ceil(discoveryKeys.length / 2)) {
    confidence = "medium";
  }

  return {
    matchCiId: conflict ? null : best.id,
    confidence: conflict ? "low" : confidence,
    matchedKeys: best.keys,
    missingKeys,
    conflict,
  };
}

export async function applyCiFromDiscovery(
  db: Database,
  normalizedCi: NormalizedCi,
  matchCiId: string | null,
  classId: string,
): Promise<string> {
  const attrs = { ...normalizedCi.attributes };
  for (const [k, v] of Object.entries(normalizedCi.matchKeys)) {
    attrs[k] = v;
  }

  const name =
    normalizedCi.name ??
    String(normalizedCi.matchKeys.hostname ?? normalizedCi.matchKeys.serial_number ?? "discovered-ci");

  if (matchCiId) {
    const [existing] = await db
      .select()
      .from(configurationItem)
      .where(eq(configurationItem.id, matchCiId))
      .limit(1);

    const merged = { ...(existing?.attributes as Record<string, unknown>), ...attrs };
    await db
      .update(configurationItem)
      .set({
        attributes: merged,
        environment: normalizedCi.environment ?? existing?.environment ?? "production",
        updatedAt: new Date(),
      })
      .where(eq(configurationItem.id, matchCiId));
    return matchCiId;
  }

  const [created] = await db
    .insert(configurationItem)
    .values({
      classId,
      name,
      status: "active",
      environment: normalizedCi.environment ?? "production",
      attributes: attrs,
    })
    .returning({ id: configurationItem.id });

  return created.id;
}

export async function resolveClassId(db: Database, className: string): Promise<string | null> {
  const [cls] = await db.select().from(ciClass).where(eq(ciClass.name, className)).limit(1);
  return cls?.id ?? null;
}
