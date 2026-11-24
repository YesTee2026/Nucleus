import type { ScannerAdapter } from "./base.js";
import { openvasAdapter, rapid7Adapter } from "./openvas.js";
import { qualysAdapter } from "./qualys.js";
import { tenableAdapter } from "./tenable.js";
import { trivyAdapter } from "./trivy.js";
import { webhookAdapter } from "./webhook.js";

const adapters: Record<string, ScannerAdapter> = {
  trivy: trivyAdapter,
  webhook: webhookAdapter,
  tenable: tenableAdapter,
  qualys: qualysAdapter,
  openvas: openvasAdapter,
  rapid7: rapid7Adapter,
};

export function getAdapter(type: string): ScannerAdapter | undefined {
  return adapters[type];
}

export function listAdapters(): string[] {
  return Object.keys(adapters);
}

export { type ScannerAdapter } from "./base.js";
