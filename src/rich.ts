/**
 * @module
 *
 * Rich Messages authoring for the Telegram Bot API (Bot API 10.3
 * {@link https://core.telegram.org/bots/api#rich-messages | rich messages}).
 *
 * Re-exports `@gramio/format/rich` so `gramio` users get the `rich\`\`` tag and block helpers
 * without depending on `@gramio/format` directly. Use `rich`/`markdownTable` for the Markdown
 * lane and `blocks`/`table` for native structured rich messages. Pass either branded result to
 * `ctx.send` / `ctx.reply` / `ctx.editText` (routed to `sendRichMessage`) or stream Markdown with
 * `ctx.streamRichMessage`.
 *
 * @example
 * ```ts
 * import { rich, heading, list } from "gramio/rich";
 * import { bold, format } from "gramio";
 *
 * ctx.send(rich`
 *   ${heading(1, "Q1 Report")}
 *   ${list([format`Revenue: ${bold("$1.2M")}`, "42k users"])}
 * `);
 * ```
 */
export * from "@gramio/format/rich";
