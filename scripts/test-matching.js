"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { console };

vm.createContext(context);
vm.runInContext(fs.readFileSync("dist/shared/matching.js", "utf8"), context);

const matching = context.SpoilerShieldShared;

assert.ok(matching, "SpoilerShieldShared namespace should be available");

function createRule(id, keyword, enabled = true) {
  return {
    id,
    keyword,
    enabled,
    createdAt: 1
  };
}

function assertMatch(result, keyword, ruleId) {
  assert.equal(result.matched, true);
  assert.equal(result.keyword, keyword);
  assert.equal(result.ruleId, ruleId);
}

function assertNoMatch(result) {
  assert.equal(result.matched, false);
  assert.equal(result.keyword, undefined);
  assert.equal(result.ruleId, undefined);
}

assert.equal(matching.normalizeText("  EREN   final  scene  "), "eren final scene");
assert.equal(matching.normalizeText("ending: explained; finale, death-scene"), "ending explained finale death scene");

let result = matching.matchTextAgainstRules("Eren final scene explained", [
  createRule("rule-1", "Eren")
]);
assertMatch(result, "Eren", "rule-1");

result = matching.matchTextAgainstRules("EREN final scene", [
  createRule("rule-2", "eren")
]);
assertMatch(result, "eren", "rule-2");

result = matching.matchTextAgainstRules("The ending explained in detail", [
  createRule("rule-3", "ending explained")
]);
assertMatch(result, "ending explained", "rule-3");

result = matching.matchTextAgainstRules("The ending: explained in detail", [
  createRule("rule-7", "ending explained")
]);
assertMatch(result, "ending explained", "rule-7");

result = matching.matchTextAgainstRules("The ending - explained in detail", [
  createRule("rule-8", "ending explained")
]);
assertMatch(result, "ending explained", "rule-8");

result = matching.matchTextAgainstRules("The ending; explained in detail", [
  createRule("rule-9", "ending explained")
]);
assertMatch(result, "ending explained", "rule-9");

result = matching.matchTextAgainstRules("Eren final scene", [
  createRule("rule-4", "")
]);
assertNoMatch(result);

result = matching.matchTextAgainstRules("Eren final scene", [
  createRule("rule-5", "Eren", false)
]);
assertNoMatch(result);

result = matching.matchTextAgainstRules("No spoilers here", [
  createRule("rule-6", "Dune")
]);
assertNoMatch(result);

console.log("matching tests passed");
