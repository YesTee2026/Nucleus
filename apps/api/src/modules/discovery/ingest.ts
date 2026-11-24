import {
  canonicalDiscoveryPayloadSchema,
  normalizedCiSchema,
  rawDiscoveryPayloadSchema,
  type FieldTransform,
  type NormalizedCi,
} from "@nucleus/shared";
import { eq } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import {
  discoveryFieldMap,
  discoveryResult,
  discoverySource,
  fieldAlias,
} from "../../db/schema/index.js";
import { buildAliasMap } from "./aliases.js";
import { mapRawToNormalizedCi } from "./mapper.js";
import {
  applyCiFromDiscovery,
  reconcileCi,
  resolveClassId,
} from "./reconciler.js";

export interface IngestOptions {
  autoApplyHighConfidence?: boolean;
  jobId?: string;
}

export interface IngestItemResult {
  normalizedCi: NormalizedCi;
  resultId: string;
  status: "pending" | "merged" | "created" | "rejected";
  matchCiId: string | null;
  confidence: "high" | "medium" | "low";
}

function parsePayload(payload: unknown): NormalizedCi[] {
  const canonical = canonicalDiscoveryPayloadSchema.safeParse(payload);
  if (canonical.success) return canonical.data.cis;

  const single = normalizedCiSchema.safeParse(payload);
  if (single.success) return [single.data];

  const raw = rawDiscoveryPayloadSchema.safeParse(payload);
  if (raw.success) return [{ class: raw.data.class ?? "cmdb_ci_server", matchKeys: {}, attributes: raw.data.raw }];

  throw new Error("Invalid discovery payload");
}

export async function ingestDiscoveryPayload(
  db: Database,
  sourceId: string,
  payload: unknown,
  options: IngestOptions = {},
): Promise<IngestItemResult[]> {
  const [source] = await db
    .select()
    .from(discoverySource)
    .where(eq(discoverySource.id, sourceId))
    .limit(1);

  if (!source) throw new Error("Discovery source not found");

  const maps = await db
    .select()
    .from(discoveryFieldMap)
    .where(eq(discoveryFieldMap.discoverySourceId, sourceId));

  const aliases = await db.select().from(fieldAlias);
  const aliasMap = buildAliasMap(aliases);
  const defaultClass = source.className ?? "cmdb_ci_server";

  let cis: NormalizedCi[];
  const rawParse = rawDiscoveryPayloadSchema.safeParse(payload);

  if (rawParse.success) {
    cis = [
      mapRawToNormalizedCi(
        rawParse.data.raw,
        maps.map((m) => ({
          sourceField: m.sourceField,
          targetField: m.targetField,
          transform: m.transform as FieldTransform,
          transformArg: m.transformArg ?? undefined,
        })),
        aliasMap,
        rawParse.data.class ?? defaultClass,
      ),
    ];
  } else {
    cis = parsePayload(payload);
  }

  const results: IngestItemResult[] = [];

  for (const normalizedCi of cis) {
    const parsed = normalizedCiSchema.parse(normalizedCi);
    const reconcile = await reconcileCi(db, parsed);

    let status: IngestItemResult["status"] = "pending";
    let matchCiId = reconcile.matchCiId;

    const shouldAutoApply =
      options.autoApplyHighConfidence &&
      reconcile.confidence === "high" &&
      reconcile.matchCiId !== null;

    if (shouldAutoApply && reconcile.matchCiId) {
      const classId = (await resolveClassId(db, parsed.class)) ?? source.classId;
      if (classId) {
        matchCiId = await applyCiFromDiscovery(db, parsed, reconcile.matchCiId, classId);
        status = "merged";
      }
    } else if (
      options.autoApplyHighConfidence &&
      reconcile.confidence === "high" &&
      !reconcile.matchCiId &&
      !reconcile.conflict
    ) {
      const classId = (await resolveClassId(db, parsed.class)) ?? source.classId;
      if (classId) {
        matchCiId = await applyCiFromDiscovery(db, parsed, null, classId);
        status = "created";
      }
    }

    const [row] = await db
      .insert(discoveryResult)
      .values({
        discoverySourceId: sourceId,
        jobId: options.jobId,
        rawPayload: rawParse.success ? (rawParse.data.raw as Record<string, unknown>) : (payload as Record<string, unknown>),
        normalizedCi: parsed as Record<string, unknown>,
        matchCiId,
        confidence: reconcile.confidence,
        status,
        processedAt: status !== "pending" ? new Date() : undefined,
      })
      .returning();

    results.push({
      normalizedCi: parsed,
      resultId: row.id,
      status,
      matchCiId,
      confidence: reconcile.confidence,
    });
  }

  await db
    .update(discoverySource)
    .set({ lastRunAt: new Date(), lastRunStatus: "success" })
    .where(eq(discoverySource.id, sourceId));

  return results;
}

export async function approveDiscoveryResult(db: Database, resultId: string): Promise<void> {
  const [result] = await db
    .select()
    .from(discoveryResult)
    .where(eq(discoveryResult.id, resultId))
    .limit(1);

  if (!result || result.status !== "pending") {
    throw new Error("Result not found or already processed");
  }

  const normalizedCi = normalizedCiSchema.parse(result.normalizedCi);
  const [source] = await db
    .select()
    .from(discoverySource)
    .where(eq(discoverySource.id, result.discoverySourceId))
    .limit(1);

  const classId =
    (await resolveClassId(db, normalizedCi.class)) ?? source?.classId ?? null;
  if (!classId) throw new Error("Cannot resolve CI class");

  const ciId = await applyCiFromDiscovery(
    db,
    normalizedCi,
    result.matchCiId,
    classId,
  );

  await db
    .update(discoveryResult)
    .set({
      status: result.matchCiId ? "merged" : "created",
      matchCiId: ciId,
      processedAt: new Date(),
    })
    .where(eq(discoveryResult.id, resultId));
}

export async function rejectDiscoveryResult(db: Database, resultId: string): Promise<void> {
  await db
    .update(discoveryResult)
    .set({ status: "rejected", processedAt: new Date() })
    .where(eq(discoveryResult.id, resultId));
}
