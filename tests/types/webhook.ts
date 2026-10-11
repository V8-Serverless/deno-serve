import type { Bot } from "grammy";
import type { AppConfig } from "./types.ts";

const HEADER = "X-Telegram-Bot-Api-Secret-Token";

async function equalSecret(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const aa = new Uint8Array(da); const bb = new Uint8Array(db);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) diff |= (aa[i % aa.length] ?? 0) ^ (bb[i % bb.length] ?? 0);
  return diff === 0;
}

export async function handleWebhook(request: Request, config: AppConfig, bot: Bot): Promise<Response> {
  const incoming = request.headers.get(HEADER);
  if (!incoming || !(await equalSecret(incoming, config.webhookSecret))) return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let update: unknown;
  try { update = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  try {
    await bot.handleUpdate(update as never);
  } catch (error) {
    console.error("update_failed", error instanceof Error ? error.message : "unknown_error");
  }
  return new Response("OK", { status: 200 });
}
