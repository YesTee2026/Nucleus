import "dotenv/config";
import { Queue, Worker } from "bullmq";
import { db } from "../db/index.js";
import { syncScannerConnection } from "../modules/vuln/sync/sync-service.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const parsed = new URL(redisUrl);

const connection = {
  host: parsed.hostname,
  port: parseInt(parsed.port || "6379", 10),
  maxRetriesPerRequest: null as null,
};

export const vulnSyncQueue = new Queue("vuln-sync", { connection });

export async function scheduleScannerSync(connectionId: string, cron?: string) {
  await vulnSyncQueue.add(
    "sync",
    { connectionId },
    {
      jobId: `vuln-sync-${connectionId}`,
      repeat: cron ? { pattern: cron } : undefined,
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  );
}

export function startVulnSyncWorker() {
  const worker = new Worker(
    "vuln-sync",
    async (job) => {
      const { connectionId } = job.data as { connectionId: string };
      const processed = await syncScannerConnection(db, connectionId);
      return { processed };
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`Vuln sync job ${job?.id} failed:`, err.message);
  });

  return worker;
}

if (process.argv[1]?.includes("run-vuln-worker")) {
  console.log("Starting vuln-sync worker...");
  startVulnSyncWorker();
}
