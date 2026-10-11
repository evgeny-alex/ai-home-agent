import { createServer } from "node:http";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { EditedMessage } from "telegram/events/EditedMessage.js";
import { loadConfig } from "./config.js";
import { claimNotification, migrate, notificationResult, pingDatabase, saveMessage } from "./database.js";
import { evaluateListing, parseListing } from "./parser.js";
const config = loadConfig(), sources = new Set(config.monitoredChatIds.map(String));
let ready = false;
const server = createServer((request, response) => { const ok = request.url === "/health" || request.url === "/ready" && ready; response.writeHead(ok ? 200 : request.url === "/ready" ? 503 : 404).end(ok ? "ok\n" : "not ready\n"); }).listen(config.PORT, "0.0.0.0");
const client = new TelegramClient(new StringSession(config.TELEGRAM_SESSION), config.TELEGRAM_API_ID, config.TELEGRAM_API_HASH, { connectionRetries: 5 });
const chatId = (value: unknown) => { try { const id = BigInt(String(value)); return id < 0n ? id : null; } catch { return null; } };
async function processMessage(message: { id: number; message?: string; date: number; chatId?: unknown }, knownChatId?: bigint): Promise<void> {
  const sourceId = chatId(message.chatId) ?? knownChatId ?? null, text = message.message?.trim();
  if (!sourceId || !sources.has(sourceId.toString()) || !text) return;
  const parsed = parseListing(text, config.rule.cities, config.rule.exclude), result = evaluateListing(parsed, config.rule);
  await saveMessage({ chatId: sourceId, messageId: message.id, date: new Date(message.date * 1000), content: text, parsed });
  if (!result.matched || result.price === undefined) return;
  const matchId = await claimNotification({ chatId: sourceId, messageId: message.id, ruleVersion: config.ruleVersion, price: result.price, currency: config.rule.price.currency });
  if (!matchId) return;
  try { const entity = await client.getEntity(sourceId.toString()), title = "title" in entity ? entity.title : "Telegram chat", username = "username" in entity && entity.username ? entity.username : undefined, link = username ? `https://t.me/${username}/${message.id}` : sourceId.toString().startsWith("-100") ? `https://t.me/c/${sourceId.toString().slice(4)}/${message.id}` : `Message ID: ${message.id}`; const sent = await client.sendMessage(await client.getInputEntity(config.NOTIFICATION_CHAT_ID.toString()), { message: `🏠 Подходит под фильтр «Batumi purchase»\n${result.price.toLocaleString("en-US")} ${config.rule.price.currency} · ${parsed.layout} · ${parsed.city}\nСовпало: продажа, квартира, ${parsed.layout}, цена ≤ ${config.rule.price.max.toLocaleString("en-US")} USD\nИсточник: ${title}\n${link}` }); await notificationResult(matchId, sent.id); } catch (error) { await notificationResult(matchId); throw error; }
}
await migrate(); await pingDatabase(); await client.connect();
if (String((await client.getMe()).id) !== config.TELEGRAM_EXPECTED_USER_ID.toString()) throw new Error("TELEGRAM_EXPECTED_USER_ID does not match the authorized account");
await client.getInputEntity(config.NOTIFICATION_CHAT_ID.toString()); await Promise.all(config.monitoredChatIds.map((id) => client.getInputEntity(id.toString())));
if (config.INITIAL_BACKFILL_LIMIT) for (const id of config.monitoredChatIds) for await (const message of client.iterMessages(id.toString(), { limit: config.INITIAL_BACKFILL_LIMIT, reverse: true })) await processMessage(message, id);
client.addEventHandler((event) => processMessage(event.message).catch((error: unknown) => console.error("Property message failed", error instanceof Error ? error.message : "Unknown error")), new NewMessage({}));
client.addEventHandler((event) => processMessage(event.message).catch((error: unknown) => console.error("Property message edit failed", error instanceof Error ? error.message : "Unknown error")), new EditedMessage({}));
ready = true; console.info("Property monitor is ready");
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { ready = false; server.close(); void client.disconnect().then(() => process.exit(0)); });
