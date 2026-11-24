import { normalizedFindingSchema, type NormalizedFinding } from "@nucleus/shared";
import { z } from "zod";
import { type ScannerAdapter } from "./base.js";

const webhookPayloadSchema = z.object({
  findings: z.array(normalizedFindingSchema),
});

export const webhookAdapter: ScannerAdapter = {
  type: "webhook",

  async testConnection() {
    return { ok: true, message: "Webhook adapter ready to receive POST payloads" };
  },

  async fetchFindings() {
    return [];
  },

  parseWebhook(payload: unknown): NormalizedFinding[] {
    const parsed = webhookPayloadSchema.safeParse(payload);
    if (parsed.success) return parsed.data.findings;
    const single = normalizedFindingSchema.safeParse(payload);
    if (single.success) return [single.data];
    return [];
  },
};
