import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import { agentMemory } from "../../db/schema/index.js";
import type { MemoryKind } from "@nucleus/shared";

export function normalizePattern(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function rememberClassification(
  db: Database,
  input: {
    kind: MemoryKind;
    pattern: string;
    resolvedClass?: string;
    resolvedCategory?: string;
    resolvedType?: string;
    payload?: Record<string, unknown>;
    createdBy?: string;
    source?: string;
  },
) {
  const patternNormalized = normalizePattern(input.pattern);
  const existing = await db
    .select()
    .from(agentMemory)
    .where(
      and(eq(agentMemory.kind, input.kind), eq(agentMemory.patternNormalized, patternNormalized)),
    )
    .limit(1);

  if (existing[0]) {
    const [row] = await db
      .update(agentMemory)
      .set({
        resolvedClass: input.resolvedClass ?? existing[0].resolvedClass,
        resolvedCategory: input.resolvedCategory ?? existing[0].resolvedCategory,
        resolvedType: input.resolvedType ?? existing[0].resolvedType,
        payload: input.payload ?? existing[0].payload ?? {},
        hitCount: sql`${agentMemory.hitCount} + 1`,
        lastUsedAt: new Date(),
        confidence: 1,
      })
      .where(eq(agentMemory.id, existing[0].id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(agentMemory)
    .values({
      kind: input.kind,
      pattern: input.pattern.trim(),
      patternNormalized,
      resolvedClass: input.resolvedClass,
      resolvedCategory: input.resolvedCategory,
      resolvedType: input.resolvedType,
      payload: input.payload ?? {},
      confidence: 1,
      hitCount: 1,
      source: input.source ?? "user_confirm",
      createdBy: input.createdBy,
      lastUsedAt: new Date(),
    })
    .returning();
  return row;
}

export async function listMemory(db: Database, limit = 100) {
  return db.select().from(agentMemory).orderBy(desc(agentMemory.lastUsedAt)).limit(limit);
}

export async function lookupMemory(db: Database, pattern: string, kind?: MemoryKind) {
  const patternNormalized = normalizePattern(pattern);
  return db
    .select()
    .from(agentMemory)
    .where(
      kind
        ? and(eq(agentMemory.patternNormalized, patternNormalized), eq(agentMemory.kind, kind))
        : eq(agentMemory.patternNormalized, patternNormalized),
    )
    .limit(10);
}
