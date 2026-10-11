import { createBot } from "./telegram.ts";
import { loadConfig } from "./config.ts";
import { registerRoutes } from "./router.ts";
import { handleWebhook } from "./webhook.ts";
import { startQueueConsumer } from "./queue.ts";
import { registerCron } from "./cron.ts";

const config = loadConfig();
const bot = createBot(config);
registerRoutes(bot, config);
startQueueConsumer(bot);
registerCron();

Deno.serve({ port: config.port }, async request => {
  const url = new URL(request.url);
  if (url.pathname === "/telegram/webhook") return handleWebhook(request, config, bot);
  if (url.pathname === "/" || url.pathname === "/health") return new Response("Telegram personal serverless bot is running.");
  return new Response("Not found", { status: 404 });
});
