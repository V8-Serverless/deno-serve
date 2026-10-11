import { Bot, InlineKeyboard } from "grammy";
import type { AppConfig } from "./types.ts";

export function createBot(config: AppConfig): Bot {
  return new Bot(config.telegramBotToken);
}

export function isOwner(config: AppConfig, userId: number | undefined): boolean {
  return userId === config.ownerId;
}

export function buildKeyboard(buttons: { text: string; url: string }[]): InlineKeyboard | undefined {
  if (!buttons.length) return undefined;
  const keyboard = new InlineKeyboard();
  for (const button of buttons) keyboard.url(button.text, button.url).row();
  return keyboard;
}
