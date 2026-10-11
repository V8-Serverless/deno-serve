import type { Context } from "grammy";
import type { AppConfig } from "../types.ts";
import { isOwner } from "../telegram.ts";

export async function handleCallback(ctx: Context, config: AppConfig) {
  if (!ctx.from || !isOwner(config, ctx.from.id)) {
    await ctx.answerCallbackQuery({ text: "Not authorized", show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();
}
