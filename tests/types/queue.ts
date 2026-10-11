import type { Bot } from "grammy";
import type { QueueJob } from "./types.ts";
import { getScheduledTask, markScheduledTask } from "./storage/content.ts";
import { kv } from "./storage/kv.ts";
import { publishContent, refreshPublishedContent } from "./services/publish.ts";

export function startQueueConsumer(bot: Bot): void {
  kv.listenQueue(async (job: QueueJob) => {
    if (job.type === "publish") await publishContent(bot, job.contentId, job.chatIds);
    if (job.type === "refresh-buttons") await refreshPublishedContent(bot, job.contentId);
    if (job.type === "scheduled-task") {
      const task = await getScheduledTask(job.taskId);
      if (!task || task.status !== "pending") return;
      try { await publishContent(bot, task.contentId, task.chatIds); await markScheduledTask(task.id, "done"); }
      catch { await markScheduledTask(task.id, "failed"); throw new Error(`Scheduled task ${task.id} failed`); }
    }
  });
}
