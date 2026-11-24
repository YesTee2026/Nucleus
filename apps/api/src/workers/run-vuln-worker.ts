#!/usr/bin/env node
import "dotenv/config";
import { startVulnSyncWorker } from "./vuln-sync-worker.js";

console.log("Starting vuln-sync worker...");
startVulnSyncWorker();
