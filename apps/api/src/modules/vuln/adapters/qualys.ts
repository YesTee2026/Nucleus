import type { NormalizedFinding } from "@nucleus/shared";
import { mapCvssToSeverity, type ScannerAdapter, type ScannerConfig } from "./base.js";

export const qualysAdapter: ScannerAdapter = {
  type: "qualys",

  async testConnection(config: ScannerConfig, credentials?) {
    if (!config.baseUrl) return { ok: false, message: "baseUrl is required" };
    if (!credentials?.username || !credentials?.password) {
      return { ok: false, message: "Qualys requires username and password" };
    }
    try {
      const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
      const res = await fetch(`${config.baseUrl}/api/2.0/fo/session/`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "X-Requested-With": "Nucleus" },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok
        ? { ok: true, message: "Qualys API authenticated" }
        : { ok: false, message: `Qualys auth failed: ${res.status}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
    }
  },

  async fetchFindings(config: ScannerConfig, credentials?) {
    if (!config.baseUrl || !credentials?.username || !credentials?.password) return [];
    const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
    const res = await fetch(
      `${config.baseUrl}/api/2.0/fo/asset/host/vm/detection/?action=list&truncation_limit=100`,
      {
        headers: { Authorization: `Basic ${auth}`, "X-Requested-With": "Nucleus" },
      },
    );
    if (!res.ok) throw new Error(`Qualys fetch failed: ${res.status}`);
    const text = await res.text();
    return parseQualysXml(text);
  },

  parseWebhook(payload: unknown) {
    const data = payload as QualysDetection;
    const score = data.SEVERITY ? parseInt(data.SEVERITY, 10) * 2 : 5;
    return [
      {
        externalId: `qualys-${data.QID}-${data.IP}`,
        cveId: data.CVE_ID ?? `QUALYS-${data.QID}`,
        title: data.TITLE ?? `QID ${data.QID}`,
        description: data.RESULTS,
        severity: mapCvssToSeverity(score),
        cvssScore: score,
        assetIp: data.IP,
        assetHostname: data.DNS,
        rawPayload: data as unknown as Record<string, unknown>,
      },
    ];
  },
};

interface QualysDetection {
  QID?: string;
  CVE_ID?: string;
  TITLE?: string;
  RESULTS?: string;
  SEVERITY?: string;
  IP?: string;
  DNS?: string;
}

function parseQualysXml(_xml: string): NormalizedFinding[] {
  // Simplified — production would use an XML parser
  return [];
}
