import type { Bot } from "grammy";
import { getDueTaskIds } from "./storage/kv.ts";
import { enqueue } from "./storage/kv.ts";

export function registerCron(): void {
  Deno.cron("scheduled-tasks", "* * * * *", async () => {
    for (const taskId of await getDueTaskIds()) await enqueue({ type: "scheduled-task", taskId });
  });
}
