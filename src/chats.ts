import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { loadConfig } from "./config.js";
const config = loadConfig(), client = new TelegramClient(new StringSession(config.TELEGRAM_SESSION), config.TELEGRAM_API_ID, config.TELEGRAM_API_HASH, { connectionRetries: 5 });
await client.connect();
for (const dialog of await client.getDialogs({ limit: 100 })) { if (!dialog.entity) continue; const name = "title" in dialog.entity ? dialog.entity.title : "firstName" in dialog.entity ? dialog.entity.firstName : "Unknown"; console.log(`${(await client.getPeerId(dialog.entity)).toString()}\t${name}`); }
await client.disconnect();
