namespace SpoilerShieldShared {
  export function normalizeText(value: string): string {
    return value
      .toLowerCase()
      .replace(/[\p{P}\p{S}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  export function createEmptyMatchResult(): MatchResult {
    return { matched: false };
  }

  export function matchTextAgainstRules(text: string, rules: SpoilerRule[]): MatchResult {
    const normalizedText = normalizeText(text);

    if (!normalizedText) {
      return createEmptyMatchResult();
    }

    for (const rule of rules) {
      if (!rule.enabled) {
        continue;
      }

      const normalizedKeyword = normalizeText(rule.keyword);

      if (!normalizedKeyword) {
        continue;
      }

      if (normalizedText.includes(normalizedKeyword)) {
        return {
          matched: true,
          keyword: rule.keyword,
          ruleId: rule.id
        };
      }
    }

    return createEmptyMatchResult();
  }
}
