import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
const apiId = Number(process.env.TELEGRAM_API_ID), apiHash = process.env.TELEGRAM_API_HASH;
if (!Number.isInteger(apiId) || !apiHash) throw new Error("Set TELEGRAM_API_ID and TELEGRAM_API_HASH");
const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
await client.start({ phoneNumber: () => input.text("Telegram phone number: "), password: () => input.password("2FA password: "), phoneCode: () => input.text("Telegram code: "), onError: (error) => console.error(error.message) });
console.log("Save as TELEGRAM_SESSION in RelaxDev:\n", client.session.save());
await client.disconnect();
