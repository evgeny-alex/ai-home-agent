import { z } from "zod";

const chatId = z.coerce.bigint().refine((value) => value < 0n, "Telegram chat ID must be negative");
const ruleSchema = z.object({
  intent: z.literal("sale"), propertyTypes: z.array(z.literal("apartment")).min(1),
  price: z.object({ currency: z.enum(["USD", "GEL", "EUR"]), max: z.number().positive() }),
  cities: z.array(z.string()).min(1), layouts: z.array(z.enum(["1+1", "2+1"])).min(1), exclude: z.array(z.string()).default([]),
});
const schema = z.object({
  DATABASE_URL: z.string().min(1), TELEGRAM_API_ID: z.coerce.number().int().positive(), TELEGRAM_API_HASH: z.string().min(1), TELEGRAM_SESSION: z.string().min(1),
  TELEGRAM_EXPECTED_USER_ID: z.coerce.bigint().positive(), MONITORED_CHAT_IDS: z.string().min(1), NOTIFICATION_CHAT_ID: chatId,
  PROPERTY_RULES_JSON: z.string().min(1), PORT: z.coerce.number().int().min(1).max(65535).default(8080), INITIAL_BACKFILL_LIMIT: z.coerce.number().int().min(0).max(100).default(0),
});
export type PropertyRule = z.infer<typeof ruleSchema>;
export type Config = Omit<z.infer<typeof schema>, "MONITORED_CHAT_IDS" | "PROPERTY_RULES_JSON"> & { monitoredChatIds: bigint[]; rule: PropertyRule; ruleVersion: string };
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const base = schema.parse(env);
  const monitoredChatIds = [...new Set(base.MONITORED_CHAT_IDS.split(",").map((value) => chatId.parse(value.trim())))];
  if (monitoredChatIds.includes(base.NOTIFICATION_CHAT_ID)) throw new Error("NOTIFICATION_CHAT_ID must not be a monitored source chat");
  const rule = ruleSchema.parse(JSON.parse(base.PROPERTY_RULES_JSON));
  return { ...base, monitoredChatIds, rule, ruleVersion: JSON.stringify(rule) };
}
