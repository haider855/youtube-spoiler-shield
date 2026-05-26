namespace SpoilerShieldShared {
  export function getDefaultSettings(): ShieldSettings {
    return {
      enabled: DEFAULT_SETTINGS.enabled,
      blurStrength: DEFAULT_SETTINGS.blurStrength,
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

  export async function addRule(keyword: string): Promise<ShieldSettings> {
    const normalizedKeyword = normalizeKeywordForStorage(keyword);

    if (!normalizedKeyword) {
      throw new Error("Keyword cannot be empty.");
    }

    if (normalizedKeyword.length > MAX_KEYWORD_LENGTH) {
      throw new Error(`Keyword must be ${MAX_KEYWORD_LENGTH} characters or fewer.`);
    }

    return updateSettings((settings) => {
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

    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_SETTINGS.enabled,
      blurStrength: sanitizeBlurStrength(value.blurStrength),
      rules: sanitizeRules(value.rules)
    };
  }

  function sanitizeBlurStrength(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return DEFAULT_SETTINGS.blurStrength;
    }

    return value;
  }

  function sanitizeRules(value: unknown): SpoilerRule[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const rules: SpoilerRule[] = [];
    const seenKeywords = new Set<string>();

    for (const entry of value) {
      const rule = sanitizeRule(entry);

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

  function sanitizeRule(value: unknown): SpoilerRule | undefined {
    if (!isRecord(value)) {
      return undefined;
    }

    const keyword = typeof value.keyword === "string"
      ? normalizeKeywordForStorage(value.keyword)
      : "";

    if (!keyword || keyword.length > MAX_KEYWORD_LENGTH) {
      return undefined;
    }

    return {
      id: typeof value.id === "string" && value.id.trim() ? value.id : createRuleId(),
      keyword,
      enabled: typeof value.enabled === "boolean" ? value.enabled : true,
      createdAt: typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
        ? value.createdAt
        : Date.now()
    };
  }

  function normalizeKeywordForStorage(value: string): string {
    return value.replace(/\s+/g, " ").trim();
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
