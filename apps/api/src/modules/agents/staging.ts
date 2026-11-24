import { eq } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import { ciClass, ciStaging, configurationItem } from "../../db/schema/index.js";
import { rememberClassification } from "./memory.js";

export async function confirmStagingItem(
  db: Database,
  stagingId: string,
  input: {
    className: string;
    category?: string;
    typeHint?: string;
    displayName?: string;
    attributes?: Record<string, unknown>;
    remember?: boolean;
    confirmedBy: string;
    notes?: string;
  },
) {
  const [item] = await db.select().from(ciStaging).where(eq(ciStaging.id, stagingId)).limit(1);
  if (!item) throw new Error("Staging item not found");
  if (item.status !== "pending") throw new Error("Staging item is not pending");

  const [cls] = await db.select().from(ciClass).where(eq(ciClass.name, input.className)).limit(1);
  let classId = cls?.id;
  if (!classId) {
    // Allow confirming against display name too
    const [byDisplay] = await db
      .select()
      .from(ciClass)
      .where(eq(ciClass.displayName, input.className))
      .limit(1);
    classId = byDisplay?.id;
  }
  if (!classId) {
    // Create concrete class if missing so confirmation can promote
    const [createdClass] = await db
      .insert(ciClass)
      .values({
        name: input.className.includes(" ")
          ? `cmdb_ci_${input.className.toLowerCase().replace(/\s+/g, "_")}`
          : input.className,
        displayName: input.displayName ?? input.className,
        isAbstract: false,
      })
      .returning();
    classId = createdClass.id;
  }

  const name =
    input.displayName ??
    item.proposedName ??
    String((item.matchKeys as Record<string, unknown>)?.hostname ?? "confirmed-ci");

  const attrs = {
    ...(item.attributes as Record<string, unknown>),
    ...(input.attributes ?? {}),
    ...(item.matchKeys as Record<string, unknown>),
    ...(input.category ? { category: input.category } : {}),
    ...(input.typeHint ? { type: input.typeHint } : {}),
  };

  const [ci] = await db
    .insert(configurationItem)
    .values({
      classId,
      name,
      status: "discovered",
      environment: "production",
      attributes: attrs,
    })
    .returning();

  const [updated] = await db
    .update(ciStaging)
    .set({
      status: "promoted",
      confirmedClass: input.className,
      confirmedCategory: input.category,
      confirmedType: input.typeHint,
      confirmedBy: input.confirmedBy,
      confirmedAt: new Date(),
      promotedCiId: ci.id,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(eq(ciStaging.id, stagingId))
    .returning();

  let memory = null;
  if (input.remember !== false) {
    const patterns = [
      item.proposedType,
      item.proposedCategory,
      item.proposedName,
      String((item.rawPayload as Record<string, unknown>)?.vendor ?? ""),
      String((item.rawPayload as Record<string, unknown>)?.os ?? ""),
      String((item.rawPayload as Record<string, unknown>)?.type ?? ""),
    ].filter((p): p is string => !!p && p.trim().length > 0);

    for (const pattern of patterns) {
      memory = await rememberClassification(db, {
        kind: "class_mapping",
        pattern,
        resolvedClass: input.className,
        resolvedCategory: input.category,
        resolvedType: input.typeHint,
        createdBy: input.confirmedBy,
        source: "user_confirm",
        payload: { stagingId, promotedCiId: ci.id },
      });
    }
  }

  return { staging: updated, ci, memory };
}

export async function rejectStagingItem(
  db: Database,
  stagingId: string,
  input: { reason?: string; rejectedBy: string },
) {
  const [item] = await db.select().from(ciStaging).where(eq(ciStaging.id, stagingId)).limit(1);
  if (!item) throw new Error("Staging item not found");
  if (item.status !== "pending") throw new Error("Staging item is not pending");

  const [updated] = await db
    .update(ciStaging)
    .set({
      status: "rejected",
      confirmedBy: input.rejectedBy,
      confirmedAt: new Date(),
      notes: input.reason,
      updatedAt: new Date(),
    })
    .where(eq(ciStaging.id, stagingId))
    .returning();
  return updated;
}
