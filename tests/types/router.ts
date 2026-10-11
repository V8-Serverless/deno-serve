import { Bot } from "grammy";
import type { AppConfig } from "./types.ts";
import { start, newContent, list, publish, edit, addButton, buttons, setButtonUrl, schedule, replyToTicket, cancel } from "./handlers/owner.ts";
import { handleMessage } from "./handlers/message.ts";
import { handleCallback } from "./handlers/callback.ts";

export function registerRoutes(bot: Bot, config: AppConfig): void {
  bot.command("start", ctx => start(ctx, config));
  bot.command("new", ctx => newContent(ctx, config));
  bot.command("list", ctx => list(ctx, config));
  bot.command("publish", ctx => publish(ctx, config));
  bot.command("edit", ctx => edit(ctx, config));
  bot.command("addbutton", ctx => addButton(ctx, config));
  bot.command("buttons", ctx => buttons(ctx, config));
  bot.command("setbuttonurl", ctx => setButtonUrl(ctx, config));
  bot.command("schedule", ctx => schedule(ctx, config));
  bot.command("reply", ctx => replyToTicket(ctx, config));
  bot.command("cancel", ctx => cancel(ctx, config));
  bot.on("callback_query", ctx => handleCallback(ctx, config));
  bot.on("message", ctx => handleMessage(ctx, config));
  bot.catch(err => console.error("grammy_error", err.error instanceof Error ? err.error.message : "unknown_error"));
}
