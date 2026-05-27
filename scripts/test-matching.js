"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { console };

vm.createContext(context);
vm.runInContext(fs.readFileSync("dist/shared/matching.js", "utf8"), context);

const matching = context.SpoilerShieldShared;

assert.ok(matching, "SpoilerShieldShared namespace should be available");

function createRule(id, keyword, enabled = true, groupId = "general") {
  return {
    id,
    keyword,
    groupId,
    enabled,
    createdAt: 1
  };
}

function createGroup(id, name, enabled = true) {
  return {
    id,
    name,
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

result = matching.matchTextAgainstRules(
  "Dune ending explained",
  [
    createRule("rule-12", "Dune", true, "movies")
  ],
  [
    createGroup("movies", "Movies", false)
  ]
);
assertNoMatch(result);

result = matching.matchTextAgainstRules(
  "Dune ending explained",
  [
    createRule("rule-13", "Dune", true, "movies")
  ],
  [
    createGroup("movies", "Movies")
  ]
);
assertMatch(result, "Dune", "rule-13");

console.log("matching tests passed");

const storageContext = {
  console,
  crypto: {
    randomUUID() {
      return "generated-id";
    }
  },
  chrome: {
    runtime: {},
    storage: {
      local: {
        get(key, callback) {
          const result = {};
          const keys = Array.isArray(key) ? key : [key];

          for (const itemKey of keys) {
            if (Object.prototype.hasOwnProperty.call(storageState, itemKey)) {
              result[itemKey] = storageState[itemKey];
            }
          }

          callback(result);
        },
        set(items, callback) {
          Object.assign(storageState, items);
          callback?.();
        }
      }
    }
  }
};

const storageState = {
  spoilerShieldSettings: {
    enabled: true,
    blurStrength: 8,
    rules: [
      createRule("rule-10", "Dune"),
      createRule("rule-11", "Eren")
    ]
  }
};

vm.createContext(storageContext);
vm.runInContext(fs.readFileSync("dist/shared/constants.js", "utf8"), storageContext);
vm.runInContext(fs.readFileSync("dist/shared/storage.js", "utf8"), storageContext);

const storage = storageContext.SpoilerShieldShared;

assert.ok(storage, "SpoilerShieldShared storage namespace should be available");

storage.setRuleEnabled("rule-10", false)
  .then((settings) => {
    assert.equal(settings.groups.length, 4);
    assert.equal(settings.groups[0].id, "general");
    assert.equal(settings.rules[0].groupId, "general");
    assert.equal(settings.rules[0].enabled, false);
    assert.equal(settings.rules[1].enabled, true);
    assert.equal(storageState.spoilerShieldSettings.rules[0].enabled, false);
    return storage.setRuleEnabled("rule-10", true);
  })
  .then((settings) => {
    assert.equal(settings.rules[0].enabled, true);
    assert.equal(settings.rules[1].enabled, true);
    return storage.addRule("NBA finals", "sports");
  })
  .then((settings) => {
    assert.equal(settings.rules[2].keyword, "NBA finals");
    assert.equal(settings.rules[2].groupId, "sports");
    return storage.setGroupEnabled("sports", false);
  })
  .then((settings) => {
    const sportsGroup = settings.groups.find((group) => group.id === "sports");
    assert.equal(sportsGroup.enabled, false);
    console.log("storage tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
