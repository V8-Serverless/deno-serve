import type { Context } from "grammy";
import type { AppConfig } from "../types.ts";
import { isOwner } from "../telegram.ts";
import { createSupportTicket, setConversationState } from "../storage/kv.ts";
import { updateButtonUrl } from "../storage/content.ts";

function ticketId() { return crypto.randomUUID().slice(0, 8); }

export async function handleMessage(ctx: Context, config: AppConfig): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text || !ctx.from) return;
  if (isOwner(config, ctx.from.id)) return;

  const ticket = ticketId();
  await createSupportTicket(ticket, ctx.from.id);
  await ctx.api.sendMessage(config.ownerId, `Anonymous request #${ticket}\n\n${text}`);
  await ctx.reply("Your message was forwarded to the owner.");
}

export async function handleOwnerConversation(ctx: Context, config: AppConfig, state: { state: string; data?: Record<string, unknown> }) {
  if (!ctx.from || !isOwner(config, ctx.from.id) || !ctx.message?.text) return false;
  if (state.state !== "waiting_for_url") return false;
  const buttonId = String(state.data?.buttonId ?? "");
  const button = await updateButtonUrl(buttonId, ctx.message.text.trim());
  await ctx.reply("URL updated.");
  await setConversationState(ctx.from.id, { state: "idle" }, 60_000);
  return true;
}
