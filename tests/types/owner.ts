import type { Context } from "grammy";
import type { AppConfig } from "../types.ts";
import { isOwner } from "../telegram.ts";
import * as content from "../storage/content.ts";
import { clearConversationState, createSupportTicket, getConversationState, getSupportTicket, setConversationState } from "../storage/kv.ts";
import { enqueue } from "../storage/kv.ts";
import { refreshPublishedContent } from "../services/publish.ts";

export async function requireOwner(ctx: Context, config: AppConfig): Promise<boolean> {
  if (!isOwner(config, ctx.from?.id)) { await ctx.reply("Not authorized."); return false; }
  return true;
}

export async function start(ctx: Context, _config: AppConfig) { await ctx.reply("Personal serverless bot online."); }

export async function newContent(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const raw = ctx.message?.text?.replace(/^\/new\s*/, "").trim() ?? "";
  const sep = raw.indexOf("|");
  if (sep < 1) return ctx.reply("Usage: /new <title> | <body>");
  const item = await content.createContent(raw.slice(0, sep).trim(), raw.slice(sep + 1).trim());
  await ctx.reply(`Created ${item.id}`);
}

export async function list(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const rows = await content.listContent();
  await ctx.reply(rows.length ? rows.map(x => `${x.id}\n${x.title}`).join("\n\n") : "No content.");
}

export async function publish(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const raw = ctx.message?.text?.replace(/^\/publish\s*/, "").trim() ?? "";
  const [contentId, chatIdsRaw] = raw.split(/\s+/, 2);
  const chatIds = (chatIdsRaw ?? "").split(",").map(Number).filter(Number.isSafeInteger);
  if (!contentId || !chatIds.length) return ctx.reply("Usage: /publish <contentId> <chatId1,chatId2,...>");
  await enqueue({ type: "publish", contentId, chatIds });
  await ctx.reply("Publish job queued.");
}

export async function edit(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const raw = ctx.message?.text?.replace(/^\/edit\s*/, "").trim() ?? "";
  const sep = raw.indexOf("|");
  if (sep < 1) return ctx.reply("Usage: /edit <contentId> | <new body>");
  const id = raw.slice(0, sep).trim(); const body = raw.slice(sep + 1).trim();
  await content.updateContentBody(id, body);
  await enqueue({ type: "refresh-buttons", contentId: id });
  await ctx.reply("Content updated; published copies queued for refresh.");
}

export async function addButton(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const raw = ctx.message?.text?.replace(/^\/addbutton\s*/, "").trim() ?? "";
  const parts = raw.split("|").map(s => s.trim());
  if (parts.length !== 3) return ctx.reply("Usage: /addbutton <contentId> | <text> | <url>");
  await content.addButton(parts[0], parts[1], parts[2], (await content.listButtons(parts[0])).length);
  await ctx.reply("Button added.");
}

export async function buttons(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const id = ctx.message?.text?.replace(/^\/buttons\s*/, "").trim() ?? "";
  const rows = await content.listButtons(id);
  await ctx.reply(rows.length ? rows.map(x => `${x.id} — ${x.text} — ${x.url}`).join("\n") : "No buttons.");
}

export async function setButtonUrl(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const raw = ctx.message?.text?.replace(/^\/setbuttonurl\s*/, "").trim() ?? "";
  const [buttonId, url] = raw.split(/\s+/, 2);
  if (!buttonId || !url) return ctx.reply("Usage: /setbuttonurl <buttonId> <url>");
  const button = await content.updateButtonUrl(buttonId, url);
  await enqueue({ type: "refresh-buttons", contentId: button.contentId });
  await ctx.reply("Button URL updated; existing messages queued for refresh.");
}

export async function schedule(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const raw = ctx.message?.text?.replace(/^\/schedule\s*/, "").trim() ?? "";
  const parts = raw.split(/\s+/);
  if (parts.length < 3) return ctx.reply("Usage: /schedule <contentId> <chatIds> <ISO-time>");
  const task = await content.createScheduledTask(parts[0], parts[1].split(",").map(Number), Date.parse(parts[2]));
  await ctx.reply(`Scheduled ${task.id}`);
}

export async function replyToTicket(ctx: Context, config: AppConfig) {
  if (!(await requireOwner(ctx, config))) return;
  const raw = ctx.message?.text?.replace(/^\/reply\s*/, "").trim() ?? "";
  const space = raw.indexOf(" ");
  if (space < 1) return ctx.reply("Usage: /reply <ticketId> <message>");
  const ticketId = raw.slice(0, space); const message = raw.slice(space + 1);
  const ticket = await getSupportTicket(ticketId);
  if (!ticket) return ctx.reply("Ticket not found or expired.");
  await ctx.api.sendMessage(ticket.userId, message);
  await ctx.reply("Sent.");
}

export async function cancel(ctx: Context, _config: AppConfig) {
  if (ctx.from) await clearConversationState(ctx.from.id);
  await ctx.reply("Cancelled.");
}
