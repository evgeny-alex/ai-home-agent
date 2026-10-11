import type { PropertyRule } from "./config.js";
export type ParsedListing = { intent: "sale" | "rent" | "daily" | "unknown"; propertyType: "apartment" | "room" | "house" | "unknown"; prices: Array<{ amount: number; currency: "USD" | "GEL" | "EUR" }>; layout: "1+1" | "2+1" | null; city: string | null; excludedKeywords: string[] };
const prices: Array<{ currency: "USD" | "GEL" | "EUR"; pattern: RegExp }> = [
  { currency: "USD", pattern: /(?:\$\s*([\d][\d\s,.]*)|([\d][\d\s,.]*)\s*(?:usd|доллар(?:ов|а)?))/gi },
  { currency: "GEL", pattern: /(?:₾\s*([\d][\d\s,.]*)|([\d][\d\s,.]*)\s*(?:gel|лари))/gi },
  { currency: "EUR", pattern: /(?:€\s*([\d][\d\s,.]*)|([\d][\d\s,.]*)\s*(?:eur|евро))/gi },
];
const normalize = (text: string) => text.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
function amount(value: string): number | null { const parsed = Number(value.replace(/[\s,]/g, "").replace(/\.(?=\d{3}\b)/g, "")); return Number.isFinite(parsed) && parsed > 0 ? parsed : null; }
export function parseListing(text: string, cities: readonly string[], excluded: readonly string[] = []): ParsedListing {
  const normalized = normalize(text);
  const intent = /(посуточно|на сутки|\bdaily\b)/.test(normalized) ? "daily" : /(продам|прода[её]тся|продажа|\bfor sale\b|\bsale\b)/.test(normalized) ? "sale" : /(аренда|сдам|сдается|\brent\b|\bfor rent\b|\blease\b)/.test(normalized) ? "rent" : "unknown";
  const propertyType = /(квартир[аы]?|\bapartment\b|\bflat\b)/.test(normalized) ? "apartment" : /(комнат[аы]?|\broom\b)/.test(normalized) ? "room" : /(дом|\bhouse\b|\bvilla\b)/.test(normalized) ? "house" : "unknown";
  const layout = /(?:\b1\s*\+\s*1\b|\b1plus1\b|евродвушк[аи])/.test(normalized) ? "1+1" : /(?:\b2\s*\+\s*1\b|\b2plus1\b|евротр[её]шк[аи])/.test(normalized) ? "2+1" : null;
  const extracted: ParsedListing["prices"] = [];
  for (const candidate of prices) for (const match of normalized.matchAll(candidate.pattern)) { const value = amount(match[1] ?? match[2] ?? ""); const before = normalized.slice(Math.max(0, (match.index ?? 0) - 12), match.index); if (value && !/залог|комисси|deposit/.test(before)) extracted.push({ amount: value, currency: candidate.currency }); }
  return { intent, propertyType, prices: extracted, layout, city: cities.find((city) => normalized.includes(normalize(city))) ?? null, excludedKeywords: excluded.filter((term) => normalized.includes(normalize(term))) };
}
export function evaluateListing(parsed: ParsedListing, rule: PropertyRule): { matched: boolean; price?: number } {
  if (parsed.excludedKeywords.length || parsed.intent !== "sale" || parsed.propertyType !== "apartment" || !parsed.city || !parsed.layout || !rule.layouts.includes(parsed.layout)) return { matched: false };
  const price = parsed.prices.find((candidate) => candidate.currency === rule.price.currency && candidate.amount <= rule.price.max)?.amount;
  return price ? { matched: true, price } : { matched: false };
}
