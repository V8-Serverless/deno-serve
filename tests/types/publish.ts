import type { Bot } from "grammy";
import { buildKeyboard } from "../telegram.ts";
import { getContent, listButtons, listPublishedMessages, recordPublishedMessage } from "../storage/content.ts";

export async function publishContent(bot: Bot, contentId: string, chatIds: number[]): Promise<void> {
  const content = await getContent(contentId);
  if (!content) throw new Error("Content not found");
  const keyboard = buildKeyboard(await listButtons(contentId));
  for (const chatId of chatIds) {
    const message = await bot.api.sendMessage(chatId, content.body, keyboard ? { reply_markup: keyboard } : {});
    await recordPublishedMessage(contentId, chatId, message.message_id);
  }
}

export async function refreshPublishedContent(bot: Bot, contentId: string): Promise<void> {
  const content = await getContent(contentId);
  if (!content) throw new Error("Content not found");
  const keyboard = buildKeyboard(await listButtons(contentId));
  for (const row of await listPublishedMessages(contentId)) {
    try {
      await bot.api.editMessageText(row.chatId, row.messageId, content.body, keyboard ? { reply_markup: keyboard } : {});
    } catch (error) {
      console.error("message_update_failed", row.chatId, row.messageId, error instanceof Error ? error.message : "unknown_error");
    }
  }
}

export async function deletePublishedContent(bot: Bot, contentId: string): Promise<void> {
  for (const row of await listPublishedMessages(contentId)) {
    try { await bot.api.deleteMessage(row.chatId, row.messageId); } catch (error) { console.error("message_delete_failed", row.chatId, row.messageId); }
  }
}
