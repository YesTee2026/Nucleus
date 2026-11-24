import type { NormalizedFinding } from "@nucleus/shared";
import { eq, or, sql } from "drizzle-orm";
import type { Database } from "../../../db/index.js";
import { configurationItem } from "../../../db/schema/index.js";

export interface MatchedCi {
  id: string;
  name: string;
  environment: string;
  classId: string;
  attributes: Record<string, unknown>;
}

export async function matchFindingToCi(
  db: Database,
  finding: NormalizedFinding,
): Promise<MatchedCi | null> {
  const cis = await db.select().from(configurationItem);

  for (const ci of cis) {
    const attrs = (ci.attributes ?? {}) as Record<string, unknown>;
    const hostname = String(attrs.hostname ?? attrs.fqdn ?? "");
    const ip = String(attrs.ip_address ?? attrs.ip ?? "");
    const name = ci.name.toLowerCase();

    if (finding.assetHostname && hostname && hostname.includes(finding.assetHostname)) {
      return toMatched(ci);
    }
    if (finding.assetIp && ip === finding.assetIp) return toMatched(ci);
    if (finding.assetName && name === finding.assetName.toLowerCase()) return toMatched(ci);
    if (finding.assetHostname && name === finding.assetHostname.toLowerCase()) return toMatched(ci);
  }

  // DB-side JSONB lookup for discovery keys
  if (finding.assetIp) {
    const [row] = await db
      .select()
      .from(configurationItem)
      .where(
        or(
          sql`${configurationItem.attributes}->>'ip_address' = ${finding.assetIp}`,
          sql`${configurationItem.attributes}->>'hostname' = ${finding.assetHostname ?? ""}`,
        ),
      )
      .limit(1);
    if (row) return toMatched(row);
  }

  return null;
}

function toMatched(ci: typeof configurationItem.$inferSelect): MatchedCi {
  return {
    id: ci.id,
    name: ci.name,
    environment: ci.environment,
    classId: ci.classId,
    attributes: (ci.attributes ?? {}) as Record<string, unknown>,
  };
}

export async function matchFindingToCiById(db: Database, ciId: string): Promise<MatchedCi | null> {
  const [ci] = await db.select().from(configurationItem).where(eq(configurationItem.id, ciId)).limit(1);
  return ci ? toMatched(ci) : null;
}
