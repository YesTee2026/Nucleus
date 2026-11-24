import type { NormalizedFinding } from "@nucleus/shared";
import { mapCvssToSeverity, type ScannerAdapter, type ScannerConfig } from "./base.js";

export const tenableAdapter: ScannerAdapter = {
  type: "tenable",

  async testConnection(config: ScannerConfig, credentials?) {
    if (!config.baseUrl) return { ok: false, message: "baseUrl is required" };
    if (!credentials?.accessKey || !credentials?.secretKey) {
      return { ok: false, message: "Tenable requires accessKey and secretKey" };
    }
    try {
      const res = await fetch(`${config.baseUrl}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: credentials.accessKey,
          password: credentials.secretKey,
        }),
        signal: AbortSignal.timeout(10000),
      });
      return res.ok
        ? { ok: true, message: "Tenable Nessus authenticated" }
        : { ok: false, message: `Auth failed: ${res.status}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
    }
  },

  async fetchFindings(config: ScannerConfig, credentials?) {
    if (!config.baseUrl || !credentials?.accessKey) return [];
    const loginRes = await fetch(`${config.baseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: credentials.accessKey,
        password: credentials.secretKey,
      }),
    });
    if (!loginRes.ok) throw new Error("Tenable authentication failed");
    const { token } = (await loginRes.json()) as { token: string };

    const scansRes = await fetch(`${config.baseUrl}/scans`, {
      headers: { "X-Cookie": `token=${token}` },
    });
    if (!scansRes.ok) throw new Error("Failed to list Tenable scans");
    const scans = (await scansRes.json()) as { scans?: Array<{ id: number }> };
    const findings: NormalizedFinding[] = [];

    for (const scan of scans.scans ?? []) {
      const detailRes = await fetch(`${config.baseUrl}/scans/${scan.id}`, {
        headers: { "X-Cookie": `token=${token}` },
      });
      if (!detailRes.ok) continue;
      const detail = (await detailRes.json()) as TenableScanDetail;
      for (const host of detail.hosts ?? []) {
        for (const vuln of host.vulnerabilities ?? []) {
          const score = vuln.score ?? 5;
          findings.push({
            externalId: `tenable-${scan.id}-${host.hostname}-${vuln.plugin_id}`,
            cveId: vuln.cve ?? `TENABLE-${vuln.plugin_id}`,
            title: vuln.plugin_name ?? `Plugin ${vuln.plugin_id}`,
            severity: mapCvssToSeverity(score),
            cvssScore: score,
            assetHostname: host.hostname,
            assetIp: host.host_ip,
            rawPayload: vuln as unknown as Record<string, unknown>,
          });
        }
      }
    }
    return findings;
  },

  parseWebhook(payload: unknown) {
    const data = payload as { vulnerabilities?: TenableVuln[]; hostname?: string; host_ip?: string };
    return (data.vulnerabilities ?? []).map((v) => ({
      externalId: `tenable-wh-${v.plugin_id}-${data.hostname}`,
      cveId: v.cve ?? `TENABLE-${v.plugin_id}`,
      title: v.plugin_name ?? `Plugin ${v.plugin_id}`,
      severity: mapCvssToSeverity(v.score ?? 5),
      cvssScore: v.score ?? 5,
      assetHostname: data.hostname,
      assetIp: data.host_ip,
      rawPayload: v as unknown as Record<string, unknown>,
    }));
  },
};

interface TenableScanDetail {
  hosts?: Array<{
    hostname?: string;
    host_ip?: string;
    vulnerabilities?: TenableVuln[];
  }>;
}

interface TenableVuln {
  plugin_id: number;
  plugin_name?: string;
  cve?: string;
  score?: number;
}
