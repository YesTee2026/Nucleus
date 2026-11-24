import type { NormalizedFinding } from "@nucleus/shared";

export interface ScannerConfig {
  baseUrl?: string;
  endpoint?: string;
  [key: string]: string | undefined;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

export interface ScannerAdapter {
  type: string;
  testConnection(config: ScannerConfig, credentials?: Record<string, string>): Promise<ConnectionTestResult>;
  fetchFindings(
    config: ScannerConfig,
    credentials?: Record<string, string>,
    since?: Date,
  ): Promise<NormalizedFinding[]>;
  parseWebhook(payload: unknown): NormalizedFinding[];
}

export function mapCvssToSeverity(score: number): NormalizedFinding["severity"] {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  if (score > 0) return "low";
  return "info";
}
