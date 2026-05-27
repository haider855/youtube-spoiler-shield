namespace SpoilerShieldShared {
  export function getDefaultSettings(): ShieldSettings {
    return {
      enabled: DEFAULT_SETTINGS.enabled,
      blurStrength: DEFAULT_SETTINGS.blurStrength,
      groups: cloneDefaultGroups(),
      rules: []
    };
  }

  export async function getSettings(): Promise<ShieldSettings> {
    const storedItems = await getStorageItems(STORAGE_KEY);
    const storedSettings = storedItems[STORAGE_KEY];

    return sanitizeSettings(storedSettings);
  }

  export async function saveSettings(settings: ShieldSettings): Promise<void> {
    const safeSettings = sanitizeSettings(settings);

    await setStorageItems({
      [STORAGE_KEY]: safeSettings
    });
  }

  export async function updateSettings(
    updater: (settings: ShieldSettings) => ShieldSettings
  ): Promise<ShieldSettings> {
    const currentSettings = await getSettings();
    const nextSettings = sanitizeSettings(updater(currentSettings));

    await saveSettings(nextSettings);

    return nextSettings;
  }

  export async function addRule(
    keyword: string,
    groupId: string = DEFAULT_GROUP_ID
  ): Promise<ShieldSettings> {
    const normalizedKeyword = normalizeKeywordForStorage(keyword);
    const normalizedGroupId = normalizeGroupId(groupId);

    if (!normalizedKeyword) {
      throw new Error("Keyword cannot be empty.");
    }

    if (normalizedKeyword.length > MAX_KEYWORD_LENGTH) {
      throw new Error(`Keyword must be ${MAX_KEYWORD_LENGTH} characters or fewer.`);
    }

    return updateSettings((settings) => {
      const safeGroupId = findGroup(settings.groups, normalizedGroupId)?.id ?? DEFAULT_GROUP_ID;
      const duplicateRule = settings.rules.find(
        (rule) => normalizeKeywordForStorage(rule.keyword).toLowerCase() === normalizedKeyword.toLowerCase()
      );

      if (duplicateRule) {
        throw new Error("Keyword already exists.");
      }

      if (settings.rules.length >= MAX_RULES) {
        throw new Error(`You can save up to ${MAX_RULES} spoiler keywords.`);
      }

      return {
        ...settings,
        rules: [
          ...settings.rules,
          {
            id: createRuleId(),
            keyword: normalizedKeyword,
            groupId: safeGroupId,
            enabled: true,
            createdAt: Date.now()
          }
        ]
      };
    });
  }

  export async function removeRule(ruleId: string): Promise<ShieldSettings> {
    return updateSettings((settings) => ({
      ...settings,
      rules: settings.rules.filter((rule) => rule.id !== ruleId)
    }));
  }

  export async function setRuleEnabled(ruleId: string, enabled: boolean): Promise<ShieldSettings> {
    const normalizedRuleId = ruleId.trim();

    if (!normalizedRuleId) {
      throw new Error("Keyword not found.");
    }

    return updateSettings((settings) => {
      let foundRule = false;
      const rules = settings.rules.map((rule) => {
        if (rule.id !== normalizedRuleId) {
          return rule;
        }

        foundRule = true;

        return {
          ...rule,
          enabled
        };
      });

      if (!foundRule) {
        throw new Error("Keyword not found.");
      }

      return {
        ...settings,
        rules
      };
    });
  }

  export async function moveRulesToGroup(
    ruleIds: string[],
    groupId: string
  ): Promise<ShieldSettings> {
    const normalizedRuleIds = Array.from(
      new Set(ruleIds.map((ruleId) => ruleId.trim()).filter(Boolean))
    );
    const normalizedGroupId = normalizeGroupId(groupId);

    if (normalizedRuleIds.length === 0) {
      throw new Error("Select at least one keyword.");
    }

    if (!normalizedGroupId) {
      throw new Error("Group not found.");
    }

    return updateSettings((settings) => {
      const targetGroup = findGroup(settings.groups, normalizedGroupId);

      if (!targetGroup) {
        throw new Error("Group not found.");
      }

      const targetRuleIds = new Set(normalizedRuleIds);
      const foundRuleIds = new Set<string>();
      const rules = settings.rules.map((rule) => {
        if (!targetRuleIds.has(rule.id)) {
          return rule;
        }

        foundRuleIds.add(rule.id);

        return {
          ...rule,
          groupId: targetGroup.id
        };
      });

      if (foundRuleIds.size !== normalizedRuleIds.length) {
        throw new Error("Some keywords were not found.");
      }

      return {
        ...settings,
        rules
      };
    });
  }

  export async function setGroupEnabled(groupId: string, enabled: boolean): Promise<ShieldSettings> {
    const normalizedGroupId = normalizeGroupId(groupId);

    if (!normalizedGroupId) {
      throw new Error("Group not found.");
    }

    return updateSettings((settings) => {
      let foundGroup = false;
      const groups = settings.groups.map((group) => {
        if (group.id !== normalizedGroupId) {
          return group;
        }

        foundGroup = true;

        return {
          ...group,
          enabled
        };
      });

      if (!foundGroup) {
        throw new Error("Group not found.");
      }

      return {
        ...settings,
        groups
      };
    });
  }

  export async function addGroup(name: string): Promise<ShieldSettings> {
    const normalizedName = normalizeGroupName(name);

    if (!normalizedName) {
      throw new Error("Group name cannot be empty.");
    }

    if (normalizedName.length > MAX_GROUP_NAME_LENGTH) {
      throw new Error(`Group name must be ${MAX_GROUP_NAME_LENGTH} characters or fewer.`);
    }

    return updateSettings((settings) => {
      if (settings.groups.length >= MAX_GROUPS) {
        throw new Error(`You can save up to ${MAX_GROUPS} keyword groups.`);
      }

      const duplicateGroup = settings.groups.find(
        (group) => group.name.toLowerCase() === normalizedName.toLowerCase()
      );

      if (duplicateGroup) {
        throw new Error("Group already exists.");
      }

      return {
        ...settings,
        groups: [
          ...settings.groups,
          {
            id: createGroupId(normalizedName, settings.groups),
            name: normalizedName,
            enabled: true,
            createdAt: Date.now()
          }
        ]
      };
    });
  }

  export async function removeGroup(groupId: string): Promise<ShieldSettings> {
    const normalizedGroupId = normalizeGroupId(groupId);

    if (!normalizedGroupId || normalizedGroupId === DEFAULT_GROUP_ID) {
      throw new Error("General group cannot be deleted.");
    }

    return updateSettings((settings) => {
      const groupToRemove = findGroup(settings.groups, normalizedGroupId);

      if (!groupToRemove) {
        throw new Error("Group not found.");
      }

      return {
        ...settings,
        groups: settings.groups.filter((group) => group.id !== normalizedGroupId),
        rules: settings.rules.map((rule) => rule.groupId === normalizedGroupId
          ? {
              ...rule,
              groupId: DEFAULT_GROUP_ID
            }
          : rule)
      };
    });
  }

  export async function setEnabled(enabled: boolean): Promise<ShieldSettings> {
    return updateSettings((settings) => ({
      ...settings,
      enabled
    }));
  }

  function getStorageItems(key: string): Promise<ChromeStorageResult> {
    const storageArea = getChromeStorageArea();

    return new Promise((resolve, reject) => {
      storageArea.get(key, (items) => {
        const error = getChromeRuntimeError();

        if (error) {
          reject(error);
          return;
        }

        resolve(items);
      });
    });
  }

  function setStorageItems(items: Record<string, unknown>): Promise<void> {
    const storageArea = getChromeStorageArea();

    return new Promise((resolve, reject) => {
      storageArea.set(items, () => {
        const error = getChromeRuntimeError();

        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  function getChromeStorageArea(): ChromeStorageArea {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      throw new Error("Chrome storage API is unavailable.");
    }

    return chrome.storage.local;
  }

  function getChromeRuntimeError(): Error | undefined {
    const message = chrome?.runtime?.lastError?.message;

    return message ? new Error(message) : undefined;
  }

  function sanitizeSettings(value: unknown): ShieldSettings {
    if (!isRecord(value)) {
      return getDefaultSettings();
    }

    const groups = sanitizeGroups(value.groups);

    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_SETTINGS.enabled,
      blurStrength: sanitizeBlurStrength(value.blurStrength),
      groups,
      rules: sanitizeRules(value.rules, groups)
    };
  }

  function sanitizeBlurStrength(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return DEFAULT_SETTINGS.blurStrength;
    }

    return value;
  }

  function sanitizeGroups(value: unknown): SpoilerGroup[] {
    if (!Array.isArray(value)) {
      return cloneDefaultGroups();
    }

    const groups: SpoilerGroup[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const entry of value) {
      const group = sanitizeGroup(entry);

      if (!group || seenIds.has(group.id) || seenNames.has(group.name.toLowerCase())) {
        continue;
      }

      groups.push(group);
      seenIds.add(group.id);
      seenNames.add(group.name.toLowerCase());
    }

    if (!seenIds.has(DEFAULT_GROUP_ID)) {
      groups.unshift({
        id: DEFAULT_GROUP_ID,
        name: "General",
        enabled: true,
        createdAt: 0
      });
    }

    if (groups.length > MAX_GROUPS) {
      return groups.slice(0, MAX_GROUPS);
    }

    return groups;
  }

  function sanitizeGroup(value: unknown): SpoilerGroup | undefined {
    if (!isRecord(value)) {
      return undefined;
    }

    const id = typeof value.id === "string" ? normalizeGroupId(value.id) : "";
    const name = typeof value.name === "string"
      ? normalizeGroupName(value.name)
      : "";

    if (!id || !name || name.length > MAX_GROUP_NAME_LENGTH) {
      return undefined;
    }

    return {
      id,
      name,
      enabled: typeof value.enabled === "boolean" ? value.enabled : true,
      createdAt: typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
        ? value.createdAt
        : Date.now()
    };
  }

  function sanitizeRules(value: unknown, groups: SpoilerGroup[]): SpoilerRule[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const rules: SpoilerRule[] = [];
    const seenKeywords = new Set<string>();
    const groupIds = new Set(groups.map((group) => group.id));

    for (const entry of value) {
      const rule = sanitizeRule(entry, groupIds);

      if (!rule) {
        continue;
      }

      const normalizedKeyword = normalizeKeywordForStorage(rule.keyword).toLowerCase();

      if (seenKeywords.has(normalizedKeyword)) {
        continue;
      }

      seenKeywords.add(normalizedKeyword);
      rules.push(rule);

      if (rules.length >= MAX_RULES) {
        break;
      }
    }

    return rules;
  }

  function sanitizeRule(value: unknown, groupIds: Set<string>): SpoilerRule | undefined {
    if (!isRecord(value)) {
      return undefined;
    }

    const keyword = typeof value.keyword === "string"
      ? normalizeKeywordForStorage(value.keyword)
      : "";

    if (!keyword || keyword.length > MAX_KEYWORD_LENGTH) {
      return undefined;
    }

    const groupId = typeof value.groupId === "string" && groupIds.has(normalizeGroupId(value.groupId))
      ? normalizeGroupId(value.groupId)
      : DEFAULT_GROUP_ID;

    return {
      id: typeof value.id === "string" && value.id.trim() ? value.id : createRuleId(),
      keyword,
      groupId,
      enabled: typeof value.enabled === "boolean" ? value.enabled : true,
      createdAt: typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
        ? value.createdAt
        : Date.now()
    };
  }

  function normalizeKeywordForStorage(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  function normalizeGroupName(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  function normalizeGroupId(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[\p{P}\p{S}]+/gu, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function cloneDefaultGroups(): SpoilerGroup[] {
    return DEFAULT_GROUPS.map((group) => ({ ...group }));
  }

  function findGroup(groups: SpoilerGroup[], groupId: string): SpoilerGroup | undefined {
    return groups.find((group) => group.id === groupId);
  }

  function createGroupId(name: string, groups: SpoilerGroup[]): string {
    const existingIds = new Set(groups.map((group) => group.id));
    const baseId = normalizeGroupId(name) || "group";
    let candidateId = baseId;
    let suffix = 2;

    while (existingIds.has(candidateId)) {
      candidateId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return candidateId;
  }

  function createRuleId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
