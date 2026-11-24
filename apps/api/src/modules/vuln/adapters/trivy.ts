import type { NormalizedFinding } from "@nucleus/shared";
import { mapCvssToSeverity, type ScannerAdapter, type ScannerConfig } from "./base.js";

export const trivyAdapter: ScannerAdapter = {
  type: "trivy",

  async testConnection(config: ScannerConfig) {
    if (!config.baseUrl) return { ok: false, message: "baseUrl is required" };
    try {
      const res = await fetch(`${config.baseUrl}/healthz`, { signal: AbortSignal.timeout(5000) });
      return res.ok
        ? { ok: true, message: "Trivy server reachable" }
        : { ok: false, message: `Trivy health check failed: ${res.status}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
    }
  },

  async fetchFindings(config: ScannerConfig, _credentials?, since?) {
    if (!config.baseUrl) return [];
    const url = since
      ? `${config.baseUrl}/v1/vulnerabilities?since=${since.toISOString()}`
      : `${config.baseUrl}/v1/vulnerabilities`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Trivy fetch failed: ${res.status}`);
    const data = (await res.json()) as { Results?: TrivyResult[] };
    return normalizeTrivyResults(data.Results ?? []);
  },

  parseWebhook(payload: unknown) {
    const data = payload as { Results?: TrivyResult[] };
    return normalizeTrivyResults(data.Results ?? []);
  },
};

interface TrivyResult {
  Target?: string;
  Vulnerabilities?: Array<{
    VulnerabilityID: string;
    Title?: string;
    Description?: string;
    Severity?: string;
    CVSS?: { nvd?: { V3Score?: number } };
    PkgName?: string;
    InstalledVersion?: string;
    FixedVersion?: string;
  }>;
}

function normalizeTrivyResults(results: TrivyResult[]): NormalizedFinding[] {
  const findings: NormalizedFinding[] = [];
  for (const result of results) {
    const hostname = result.Target?.split("/").pop();
    for (const v of result.Vulnerabilities ?? []) {
      const score = v.CVSS?.nvd?.V3Score ?? severityToScore(v.Severity);
      findings.push({
        externalId: `trivy-${v.VulnerabilityID}-${result.Target}-${v.PkgName}`,
        cveId: v.VulnerabilityID,
        title: v.Title ?? v.VulnerabilityID,
        description: v.Description,
        severity: mapCvssToSeverity(score),
        cvssScore: score,
        assetHostname: hostname,
        packageName: v.PkgName,
        installedVersion: v.InstalledVersion,
        fixedVersion: v.FixedVersion,
        rawPayload: v as unknown as Record<string, unknown>,
      });
    }
  }
  return findings;
}

function severityToScore(severity?: string): number {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return 9.5;
    case "HIGH":
      return 7.5;
    case "MEDIUM":
      return 5.0;
    case "LOW":
      return 2.0;
    default:
      return 0;
  }
}
