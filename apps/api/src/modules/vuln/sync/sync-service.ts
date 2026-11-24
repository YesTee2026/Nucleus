import type { NormalizedFinding } from "@nucleus/shared";
import { eq } from "drizzle-orm";
import type { Database } from "../../../db/index.js";
import { scannerConnection } from "../../../db/schema/index.js";
import { getAdapter } from "../adapters/index.js";
import { matchFindingToCi } from "../reconciler/ci-matcher.js";
import { ingestFinding } from "../reconciler/classifier.js";

export async function syncScannerConnection(db: Database, connectionId: string): Promise<number> {
  const [connection] = await db
    .select()
    .from(scannerConnection)
    .where(eq(scannerConnection.id, connectionId))
    .limit(1);

  if (!connection) throw new Error(`Scanner connection ${connectionId} not found`);

  const adapter = getAdapter(connection.adapterType);
  if (!adapter) throw new Error(`Unknown adapter: ${connection.adapterType}`);

  await db
    .update(scannerConnection)
    .set({ lastSyncStatus: "running" })
    .where(eq(scannerConnection.id, connectionId));

  try {
    const credentials = await resolveCredentials(connection.credentialProfileId);
    const since = connection.lastSyncAt ?? undefined;
    const findings = await adapter.fetchFindings(connection.config, credentials, since);

    let processed = 0;
    for (const finding of findings) {
      const matchedCi = await matchFindingToCi(db, finding);
      await ingestFinding(db, connectionId, finding, matchedCi);
      processed++;
    }

    await db
      .update(scannerConnection)
      .set({ lastSyncStatus: "success", lastSyncAt: new Date() })
      .where(eq(scannerConnection.id, connectionId));

    return processed;
  } catch (error) {
    await db
      .update(scannerConnection)
      .set({ lastSyncStatus: "failed" })
      .where(eq(scannerConnection.id, connectionId));
    throw error;
  }
}

export async function ingestWebhookPayload(
  db: Database,
  connectionId: string,
  payload: unknown,
): Promise<number> {
  const [connection] = await db
    .select()
    .from(scannerConnection)
    .where(eq(scannerConnection.id, connectionId))
    .limit(1);

  if (!connection) throw new Error(`Scanner connection ${connectionId} not found`);

  const adapter = getAdapter(connection.adapterType);
  if (!adapter) throw new Error(`Unknown adapter: ${connection.adapterType}`);

  const findings: NormalizedFinding[] = adapter.parseWebhook(payload);
  let processed = 0;

  for (const finding of findings) {
    const matchedCi = await matchFindingToCi(db, finding);
    await ingestFinding(db, connectionId, finding, matchedCi);
    processed++;
  }

  return processed;
}

async function resolveCredentials(
  credentialProfileId: string | null,
): Promise<Record<string, string> | undefined> {
  if (!credentialProfileId) return undefined;
  // Resolve from Infisical/SOPS in production
  const envPrefix = `CRED_${credentialProfileId.replace(/-/g, "_").toUpperCase()}_`;
  const credentials: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(envPrefix) && value) {
      credentials[key.replace(envPrefix, "").toLowerCase()] = value;
    }
  }
  return Object.keys(credentials).length > 0 ? credentials : undefined;
}
