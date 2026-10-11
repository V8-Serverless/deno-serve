import { describe, expect, mock, test } from "bun:test";
import { webhookHandler } from "../src/webhook/index.ts";

const SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";
/** Runtimes that expose headers as a plain object always lowercase the name */
const SECRET_HEADER_LOWERCASE = SECRET_HEADER.toLowerCase();
const SECRET = "expected-secret";
const SAMPLE_UPDATE = {
	update_id: 100,
	message: {
		message_id: 50,
		date: 0,
		chat: { id: 1, type: "private" },
	},
};

function createRequest(headers: Record<string, string> = {}) {
	return new Request("https://example.com/webhook", {
		method: "POST",
		body: JSON.stringify(SAMPLE_UPDATE),
		headers: {
			"content-type": "application/json",
			...headers,
		},
	});
}

function createBot() {
	const queueAdd = mock<(update: typeof SAMPLE_UPDATE) => void>(() => {});
	const handleUpdate = mock<(update: typeof SAMPLE_UPDATE) => Promise<void>>(
		async () => {},
	);

	return {
		bot: {
			updates: {
				queue: { add: queueAdd },
				handleUpdate,
			},
		},
		queueAdd,
		handleUpdate,
	};
}

describe("webhookHandler", () => {
	test("enqueues updates when shouldWait is disabled", async () => {
		const { bot, queueAdd, handleUpdate } = createBot();
		const handler = webhookHandler(bot as any, "Request");

		const response = await handler(createRequest());

		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(queueAdd.mock.calls[0][0]).toEqual(SAMPLE_UPDATE);
		expect(handleUpdate).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("ok!");
	});

	test("rejects request with invalid secret token", async () => {
		const { bot, queueAdd } = createBot();
		const handler = webhookHandler(bot as any, "Request", "expected-secret");

		const response = await handler(
			createRequest({
				[SECRET_HEADER]: "wrong",
			}),
		);

		expect(queueAdd).not.toHaveBeenCalled();
		expect(response.status).toBe(401);
		expect(await response.text()).toBe("secret token is invalid");
	});

	test("waits for handler when shouldWait is true", async () => {
		const { bot, queueAdd, handleUpdate } = createBot();
		const handler = webhookHandler(bot as any, "Request", { shouldWait: true });

		const response = await handler(createRequest());

		expect(queueAdd).not.toHaveBeenCalled();
		expect(handleUpdate).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
	});

	test("resolves request when handler exceeds timeout and mode is return", async () => {
		const { bot, queueAdd, handleUpdate } = createBot();
		handleUpdate.mockImplementation(
			() =>
				new Promise(() => {
					// never resolve
				}),
		);
		const handler = webhookHandler(bot as any, "Request", {
			shouldWait: { timeout: 10, onTimeout: "return" },
		});

		const start = Date.now();
		const response = await handler(createRequest());
		const duration = Date.now() - start;

		expect(duration).toBeGreaterThanOrEqual(10);
		expect(queueAdd).not.toHaveBeenCalled();
		expect(handleUpdate).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
	});

	test("throws when handler exceeds timeout and mode is throw", async () => {
		const { bot, handleUpdate } = createBot();
		handleUpdate.mockImplementation(
			() =>
				new Promise(() => {
					// never resolve
				}),
		);
		const handler = webhookHandler(bot as any, "Request", {
			shouldWait: { timeout: 10, onTimeout: "throw" },
		});

		await expect(async () => handler(createRequest())).toThrow(
			"Webhook handler execution timed out after 10ms",
		);
	});
});

describe("secret token header resolution", () => {
	function headers(value = SECRET) {
		return { [SECRET_HEADER_LOWERCASE]: value };
	}

	/** `express`/`koa`/`hono` look headers up case-insensitively */
	function caseInsensitive(value = SECRET) {
		const raw = headers(value);

		return (name: string) => raw[name.toLowerCase()];
	}

	test("fastify reads the lowercased header", async () => {
		const { bot, queueAdd } = createBot();
		const reply: any = { send: mock(() => {}) };
		reply.code = mock(() => reply);
		const handler = webhookHandler(bot as any, "fastify", SECRET);

		await handler({ body: SAMPLE_UPDATE, headers: headers() }, reply);

		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(reply.code).not.toHaveBeenCalled();
		expect(reply.send).toHaveBeenCalledWith("ok!");
	});

	test("fastify rejects a wrong token", async () => {
		const { bot, queueAdd } = createBot();
		const reply: any = { send: mock(() => {}) };
		reply.code = mock(() => reply);
		const handler = webhookHandler(bot as any, "fastify", SECRET);

		await handler({ body: SAMPLE_UPDATE, headers: headers("wrong") }, reply);

		expect(queueAdd).not.toHaveBeenCalled();
		expect(reply.code).toHaveBeenCalledWith(401);
		expect(reply.send).toHaveBeenCalledWith("secret token is invalid");
	});

	test("elysia reads the lowercased header", async () => {
		const { bot, queueAdd } = createBot();
		const handler = webhookHandler(bot as any, "elysia", SECRET);

		const response = await handler({
			body: SAMPLE_UPDATE,
			headers: headers(),
		});

		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
	});

	test("elysia rejects a wrong token", async () => {
		const { bot, queueAdd } = createBot();
		const handler = webhookHandler(bot as any, "elysia", SECRET);

		const response = await handler({
			body: SAMPLE_UPDATE,
			headers: headers("wrong"),
		});

		expect(queueAdd).not.toHaveBeenCalled();
		expect(response.status).toBe(401);
	});

	test("http reads the lowercased header", async () => {
		const { bot, queueAdd } = createBot();
		const req = {
			headers: headers(),
			on(event: string, listener: (chunk?: string) => void) {
				if (event === "data") listener(JSON.stringify(SAMPLE_UPDATE));
				else listener();
			},
		};
		const res: any = { end: mock(() => {}) };
		res.writeHead = mock(() => res);
		const handler = webhookHandler(bot as any, "http", SECRET);

		await handler(req, res);

		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(res.writeHead).toHaveBeenCalledWith(200);
		expect(res.end).toHaveBeenCalledWith("ok!");
	});

	test("express reads the header case-insensitively", async () => {
		const { bot, queueAdd } = createBot();
		const res: any = { send: mock(() => {}) };
		res.status = mock(() => res);
		const handler = webhookHandler(bot as any, "express", SECRET);

		await handler({ body: SAMPLE_UPDATE, header: caseInsensitive() }, res);

		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
		expect(res.send).toHaveBeenCalledWith("ok!");
	});

	test("koa reads the header case-insensitively and answers 401", async () => {
		const { bot, queueAdd } = createBot();
		const ctx: any = {
			request: { body: SAMPLE_UPDATE },
			get: caseInsensitive("wrong"),
		};
		const handler = webhookHandler(bot as any, "koa", SECRET);

		await handler(ctx);

		expect(queueAdd).not.toHaveBeenCalled();
		expect(ctx.status).toBe(401);
		expect(ctx.body).toBe("secret token is invalid");
	});

	test("hono reads the header case-insensitively", async () => {
		const { bot, queueAdd } = createBot();
		const handler = webhookHandler(bot as any, "hono", SECRET);

		const response = await handler({
			req: {
				json: async () => SAMPLE_UPDATE,
				header: caseInsensitive(),
			},
			text: (text: string, status: number) => new Response(text, { status }),
		});

		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
	});

	test("Request reads the header case-insensitively", async () => {
		const { bot, queueAdd } = createBot();
		const handler = webhookHandler(bot as any, "Request", SECRET);

		const response = await handler(
			createRequest({ [SECRET_HEADER_LOWERCASE]: SECRET }),
		);

		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
	});
});
