import { updateAgentSettingsSchema } from "@nucleus/shared";
import type { FastifyInstance } from "fastify";
import { getAgentSettingsPublic, saveAgentRuntimeConfig } from "./agent-config.js";

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get("/api/v1/settings", async () => ({
    agents: getAgentSettingsPublic(),
  }));

  app.get("/api/v1/settings/agents", async () => getAgentSettingsPublic());

  app.put("/api/v1/settings/agents", async (req) => {
    const body = updateAgentSettingsSchema.parse(req.body ?? {});
    saveAgentRuntimeConfig({
      anthropicApiKey: body.anthropicApiKey,
      anthropicModel: body.anthropicModel,
      cursorApiKey: body.cursorApiKey,
      cursorModel: body.cursorModel,
      preferredProvider: body.preferredProvider,
      useLocalFallback: body.useLocalFallback,
    });
    return getAgentSettingsPublic();
  });
}
