import assert from "node:assert/strict";
import test from "node:test";
import { evaluateListing, parseListing } from "./parser.js";
const rule = { intent: "sale" as const, propertyTypes: ["apartment" as const], price: { currency: "USD" as const, max: 75000 }, cities: ["Батуми", "Batumi"], layouts: ["1+1", "2+1"] as Array<"1+1" | "2+1">, exclude: [] };
test("matches a Batumi sale within the budget", () => assert.equal(evaluateListing(parseListing("Продам квартиру 1 + 1 в Батуми, $72,000", rule.cities), rule).price, 72000));
test("rejects rent, unknown layout, excluded words and a deposit", () => { assert.equal(evaluateListing(parseListing("Сдам квартиру 1+1 Батуми $700", rule.cities), rule).matched, false); assert.equal(evaluateListing(parseListing("Продам квартиру 1-комнатная Батуми $70000", rule.cities), rule).matched, false); assert.equal(evaluateListing(parseListing("Продажа квартира 2+1 Батуми залог $500, цена $74000", rule.cities), rule).price, 74000); });
