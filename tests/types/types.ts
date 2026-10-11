export interface AppConfig {
  telegramBotToken: string;
  webhookSecret: string;
  ownerId: number;
  webhookUrl?: string;
  port: number;
}

export interface ConversationState {
  state: string;
  data?: Record<string, unknown>;
  expiresAt: number;
}

export interface Content {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface ButtonRow {
  id: string;
  contentId: string;
  text: string;
  url: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface PublishedMessage {
  id: string;
  contentId: string;
  chatId: number;
  messageId: number;
  createdAt: number;
}

export interface ScheduledTask {
  id: string;
  contentId: string;
  chatIds: number[];
  runAt: number;
  status: "pending" | "done" | "failed";
  createdAt: number;
  updatedAt: number;
}

export type QueueJob =
  | { type: "publish"; contentId: string; chatIds: number[] }
  | { type: "refresh-buttons"; contentId: string }
  | { type: "scheduled-task"; taskId: string };
