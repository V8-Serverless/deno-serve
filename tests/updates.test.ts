import { beforeEach, describe, expect, it, jest } from "bun:test";
import { Bot } from "../src/bot.js";
import { Updates } from "../src/updates.js";

class MockBot {
	api = {
		getUpdates: jest.fn(),
	};
	options = { api: {} };
}

describe("Updates.stopPolling", () => {
	let updates: Updates;
	let bot: MockBot;

	beforeEach(() => {
		bot = new MockBot();
		updates = new Updates(bot as any, jest.fn());
	});

	it("resolves immediately if no request is active", async () => {
		updates.isRequestActive = false;
		const promise = updates.stopPolling();

		expect(promise).resolves.toBeUndefined();
	});

	it("resolves after request completes if request is active", async () => {
		updates.isRequestActive = true;
		let resolved = false;
		const promise = updates.stopPolling().then(() => {
			resolved = true;
		});
		setTimeout(() => {
			updates.isRequestActive = false;

			updates.stopPollingPromiseResolve?.();
		}, 50);
		await promise;

		expect(resolved).toBe(true);
	});

	it("sets isStarted to false", () => {
		updates.isStarted = true;
		updates.stopPolling();
		expect(updates.isStarted).toBe(false);
	});
});

describe("Updates.startFetchLoop stop-during-await race", () => {
	it("does not advance offset or enqueue when stopped during in-flight getUpdates", async () => {
		const batch = [
			{ update_id: 100, message: { message_id: 1 } },
			{ update_id: 101, message: { message_id: 2 } },
		];

		let resolveFirstCall: ((value: any) => void) | undefined;
		const firstCall = new Promise<any>((resolve) => {
			resolveFirstCall = resolve;
		});

		let callCount = 0;
		const bot = {
			api: {
				getUpdates: jest.fn(() => {
					callCount++;
					if (callCount === 1) return firstCall;
					// Subsequent calls (shouldn't happen, but be safe) hang forever
					return new Promise(() => {});
				}),
			},
			options: { api: {} },
		} as any;

		const updates = new Updates(bot, jest.fn());
		const offsetBefore = (updates as any).offset;
		const addBatchSpy = jest.spyOn(updates.queue, "addBatch");

		updates.isStarted = true;
		const loopPromise = updates.startFetchLoop();

		// Wait a tick so the loop reaches the await
		await new Promise((r) => setTimeout(r, 10));
		expect(updates.isRequestActive).toBe(true);

		// Now stop while getUpdates is in flight, then resolve the in-flight promise.
		await updates.stopPolling();
		resolveFirstCall?.(batch);

		await loopPromise;

		expect((updates as any).offset).toBe(offsetBefore);
		expect(addBatchSpy).not.toHaveBeenCalled();
		// Loop should have exited and not made a second getUpdates call.
		expect(callCount).toBe(1);
	});
});

describe("Updates.handleUpdate Bot API 10.3 routing", () => {
	it("delivers stopped_message_generation to its first-class context", async () => {
		let received:
			| { draftId: number; threadId: number | undefined; chatId: number }
			| undefined;
		const bot = new Bot("test-token").on(
			"stopped_message_generation",
			(context) => {
				received = {
					draftId: context.draftId,
					threadId: context.threadId,
					chatId: context.chatId,
				};
			},
		);

		await bot.updates.handleUpdate({
			update_id: 200,
			stopped_message_generation: {
				chat: { id: 42, type: "private", first_name: "Ada" },
				message_thread_id: 7,
				draft_id: 9,
			},
		});

		expect(received).toEqual({ draftId: 9, threadId: 7, chatId: 42 });
	});

	it("routes community_chat_joined through the message service event", async () => {
		let communityName: string | undefined;
		const bot = new Bot("test-token").on("community_chat_joined", (context) => {
			communityName = context.community.name;
		});

		await bot.updates.handleUpdate({
			update_id: 201,
			message: {
				message_id: 1,
				date: 0,
				chat: { id: -100, type: "supergroup", title: "Group" },
				community_chat_joined: {
					community: { id: 8, name: "Builders" },
				},
			},
		});

		expect(communityName).toBe("Builders");
	});
});
