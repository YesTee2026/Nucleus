import type { NormalizedFinding } from "@nucleus/shared";
import { mapCvssToSeverity, type ScannerAdapter, type ScannerConfig } from "./base.js";

export const openvasAdapter: ScannerAdapter = {
  type: "openvas",

  async testConnection(config: ScannerConfig, credentials?) {
    if (!config.baseUrl) return { ok: false, message: "baseUrl is required" };
    if (!credentials?.apiKey) return { ok: false, message: "OpenVAS requires apiKey" };
    try {
      const res = await fetch(`${config.baseUrl}/gmp`, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: `<authenticate><credentials><username>admin</username><password>${credentials.apiKey}</password></credentials></authenticate>`,
        signal: AbortSignal.timeout(10000),
      });
      return res.ok
        ? { ok: true, message: "OpenVAS GVM reachable" }
        : { ok: false, message: `OpenVAS connection failed: ${res.status}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
    }
  },

  async fetchFindings(config: ScannerConfig, credentials?) {
    if (!config.baseUrl) return [];
    // GMP XML protocol — stub returns empty; full impl uses gmp library
    void credentials;
    void config;
    return [];
  },

  parseWebhook(payload: unknown) {
    const data = payload as OpenVasResult;
    const score = data.nvt?.cvss_base ?? 5;
    return [
      {
        externalId: `openvas-${data.id ?? data.nvt?.oid}`,
        cveId: data.nvt?.cve ?? `GVM-${data.nvt?.oid}`,
        title: data.name ?? data.nvt?.name ?? "OpenVAS finding",
        description: data.description,
        severity: mapCvssToSeverity(score),
        cvssScore: score,
        assetIp: data.host?.ip,
        assetHostname: data.host?.hostname,
        rawPayload: data as unknown as Record<string, unknown>,
      },
    ];
  },
};

interface OpenVasResult {
  id?: string;
  name?: string;
  description?: string;
  host?: { ip?: string; hostname?: string };
  nvt?: { oid?: string; name?: string; cve?: string; cvss_base?: number };
}

export const rapid7Adapter: ScannerAdapter = {
  type: "rapid7",

  async testConnection(config: ScannerConfig, credentials?) {
    if (!config.baseUrl) return { ok: false, message: "baseUrl is required" };
    if (!credentials?.apiKey) return { ok: false, message: "Rapid7 requires apiKey" };
    try {
      const res = await fetch(`${config.baseUrl}/api/3/assets?page=0&size=1`, {
        headers: { "X-Api-Key": credentials.apiKey },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok
        ? { ok: true, message: "Rapid7 InsightVM authenticated" }
        : { ok: false, message: `Rapid7 auth failed: ${res.status}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
    }
  },

  async fetchFindings(config: ScannerConfig, credentials?) {
    if (!config.baseUrl || !credentials?.apiKey) return [];
    const res = await fetch(`${config.baseUrl}/api/3/assets?page=0&size=100`, {
      headers: { "X-Api-Key": credentials.apiKey },
    });
    if (!res.ok) throw new Error(`Rapid7 fetch failed: ${res.status}`);
    const data = (await res.json()) as { resources?: Rapid7Asset[] };
    const findings: NormalizedFinding[] = [];
    for (const asset of data.resources ?? []) {
      for (const vuln of asset.vulnerabilities ?? []) {
        const score = vuln.cvss?.v3?.score ?? vuln.severity ?? 5;
        findings.push({
          externalId: `rapid7-${asset.id}-${vuln.id}`,
          cveId: vuln.cves?.[0] ?? `RAPID7-${vuln.id}`,
          title: vuln.title ?? `Vuln ${vuln.id}`,
          severity: mapCvssToSeverity(typeof score === "number" ? score : 5),
          cvssScore: typeof score === "number" ? score : 5,
          assetIp: asset.ip,
          assetHostname: asset.hostName,
          rawPayload: vuln as unknown as Record<string, unknown>,
        });
      }
    }
    return findings;
  },

  parseWebhook(payload: unknown) {
    return openvasAdapter.parseWebhook(payload);
  },
};

interface Rapid7Asset {
  id?: number;
  ip?: string;
  hostName?: string;
  vulnerabilities?: Array<{
    id?: string;
    title?: string;
    cves?: string[];
    cvss?: { v3?: { score?: number } };
    severity?: number;
  }>;
}
