import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAgentRoutes } from "./modules/agents/routes.js";
import { registerDiscoveryRoutes } from "./modules/discovery/routes.js";
import { registerSettingsRoutes } from "./modules/settings/routes.js";
import { registerVulnRoutes } from "./modules/vuln/routes.js";
import "./modules/settings/agent-config.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await registerVulnRoutes(app);
await registerDiscoveryRoutes(app);
await registerAgentRoutes(app);
await registerSettingsRoutes(app);

app.get("/health", async () => ({ status: "ok" }));

const port = parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
