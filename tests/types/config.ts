import type { AppConfig } from "./types.ts";

function required(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function loadConfig(): AppConfig {
  const ownerRaw = required("OWNER_ID");
  const ownerId = Number(ownerRaw);
  if (!Number.isSafeInteger(ownerId)) throw new Error("OWNER_ID must be a numeric Telegram user id");

  const port = Number(Deno.env.get("PORT") ?? "8000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT is invalid");

  return {
    telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
    webhookSecret: required("TELEGRAM_WEBHOOK_SECRET"),
    ownerId,
    webhookUrl: Deno.env.get("PUBLIC_WEBHOOK_URL")?.trim() || undefined,
    port,
  };
}
