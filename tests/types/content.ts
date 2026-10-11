import type { ButtonRow, Content, PublishedMessage, ScheduledTask } from "../types.ts";
import { getKv } from "./kv.ts";

const kv = getKv();
const now = () => Date.now();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export async function createContent(title: string, body: string): Promise<Content> {
  const value: Content = { id: id("content"), title, body, createdAt: now(), updatedAt: now() };
  await kv.set(["content", value.id], value);
  return value;
}

export async function getContent(contentId: string): Promise<Content | null> {
  return (await kv.get<Content>(["content", contentId])).value ?? null;
}

export async function listContent(limit = 20): Promise<Content[]> {
  const rows: Content[] = [];
  for await (const entry of kv.list<Content>({ prefix: ["content"] })) rows.push(entry.value);
  return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function updateContentBody(contentId: string, body: string): Promise<void> {
  const content = await getContent(contentId);
  if (!content) throw new Error("Content not found");
  await kv.set(["content", contentId], { ...content, body, updatedAt: now() });
}

export async function addButton(contentId: string, text: string, url: string, position = 0): Promise<ButtonRow> {
  const button: ButtonRow = { id: id("button"), contentId, text, url, position, createdAt: now(), updatedAt: now() };
  await kv.set(["button", button.id], button);
  return button;
}

export async function listButtons(contentId: string): Promise<ButtonRow[]> {
  const rows: ButtonRow[] = [];
  for await (const entry of kv.list<ButtonRow>({ prefix: ["button"] })) {
    if (entry.value.contentId === contentId) rows.push(entry.value);
  }
  return rows.sort((a, b) => a.position - b.position);
}

export async function getButton(buttonId: string): Promise<ButtonRow | null> {
  return (await kv.get<ButtonRow>(["button", buttonId])).value ?? null;
}

export async function updateButtonUrl(buttonId: string, url: string): Promise<ButtonRow> {
  const button = await getButton(buttonId);
  if (!button) throw new Error("Button not found");
  const updated = { ...button, url, updatedAt: now() };
  await kv.set(["button", buttonId], updated);
  return updated;
}

export async function recordPublishedMessage(contentId: string, chatId: number, messageId: number): Promise<PublishedMessage> {
  const row: PublishedMessage = { id: id("pub"), contentId, chatId, messageId, createdAt: now() };
  await kv.set(["published", row.id], row);
  return row;
}

export async function listPublishedMessages(contentId: string): Promise<PublishedMessage[]> {
  const rows: PublishedMessage[] = [];
  for await (const entry of kv.list<PublishedMessage>({ prefix: ["published"] })) {
    if (entry.value.contentId === contentId) rows.push(entry.value);
  }
  return rows;
}

export async function deletePublishedMessage(idValue: string): Promise<void> {
  await kv.delete(["published", idValue]);
}

export async function createScheduledTask(contentId: string, chatIds: number[], runAt: number): Promise<ScheduledTask> {
  const task: ScheduledTask = { id: id("sched"), contentId, chatIds, runAt, status: "pending", createdAt: now(), updatedAt: now() };
  await kv.set(["scheduled", task.id], task);
  return task;
}

export async function getScheduledTask(taskId: string): Promise<ScheduledTask | null> {
  return (await kv.get<ScheduledTask>(["scheduled", taskId])).value ?? null;
}

export async function markScheduledTask(taskId: string, status: "done" | "failed"): Promise<void> {
  const task = await getScheduledTask(taskId);
  if (!task) return;
  await kv.set(["scheduled", taskId], { ...task, status, updatedAt: now() });
}
