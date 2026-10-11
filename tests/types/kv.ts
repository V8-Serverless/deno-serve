import type { ConversationState } from "../types.ts";

export const kv = await Deno.openKv();
const DEFAULT_TTL_MS = 30 * 60 * 1000;

export function getKv(): Deno.Kv { return kv; }

const key = (userId: number) => ["conversation", userId];
const supportKey = (ticketId: string) => ["support", ticketId];

export async function setConversationState(
  userId: number,
  value: Omit<ConversationState, "expiresAt">,
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  const expiresAt = Date.now() + ttlMs;
  await kv.set(key(userId), { ...value, expiresAt }, { expireIn: ttlMs });
}

export async function getConversationState(userId: number): Promise<ConversationState | null> {
  const result = await kv.get<ConversationState>(key(userId));
  return result.value ?? null;
}

export async function clearConversationState(userId: number): Promise<void> {
  await kv.delete(key(userId));
}

export async function createSupportTicket(ticketId: string, userId: number): Promise<void> {
  await kv.set(supportKey(ticketId), { userId }, { expireIn: 24 * 60 * 60 * 1000 });
}

export async function getSupportTicket(ticketId: string): Promise<{ userId: number } | null> {
  const result = await kv.get<{ userId: number }>(supportKey(ticketId));
  return result.value ?? null;
}

export async function enqueue<T>(job: T): Promise<void> {
  await kv.enqueue(job);
}

export async function getDueTaskIds(now = Date.now()): Promise<string[]> {
  const ids: string[] = [];
  for await (const entry of kv.list<{ runAt: number; status: string }>({ prefix: ["scheduled"] })) {
    if (entry.value.status === "pending" && entry.value.runAt <= now) ids.push(String(entry.key[1]));
  }
  return ids;
}
