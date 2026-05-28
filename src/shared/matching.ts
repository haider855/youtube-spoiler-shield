namespace SpoilerShieldShared {
  export function normalizeText(value: string): string {
    return value
      .toLowerCase()
      .replace(/[\p{P}\p{S}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  export function normalizeCompactText(value: string): string {
    return normalizeText(value).replace(/\s+/g, "");
  }

  export function createEmptyMatchResult(): MatchResult {
    return { matched: false };
  }

  export function matchTextAgainstRules(
    text: string,
    rules: SpoilerRule[],
    groups: SpoilerGroup[] = []
  ): MatchResult {
    const normalizedText = normalizeText(text);
    const normalizedCompactText = normalizeCompactText(text);
    const groupsById = new Map(groups.map((group) => [group.id, group]));

    if (!normalizedText) {
      return createEmptyMatchResult();
    }

    for (const rule of rules) {
      if (!isRuleActive(rule, groupsById)) {
        continue;
      }

      const normalizedKeyword = normalizeText(rule.keyword);
      const normalizedCompactKeyword = normalizeCompactText(rule.keyword);

      if (!normalizedKeyword) {
        continue;
      }

      if (
        normalizedText.includes(normalizedKeyword) ||
        normalizedCompactText.includes(normalizedCompactKeyword)
      ) {
        return {
          matched: true,
          keyword: rule.keyword,
          ruleId: rule.id
        };
      }
    }

    return createEmptyMatchResult();
  }

  function isRuleActive(rule: SpoilerRule, groupsById: Map<string, SpoilerGroup>): boolean {
    if (!rule.enabled) {
      return false;
    }

    if (groupsById.size === 0) {
      return true;
    }

    const groupId = rule.groupId || DEFAULT_GROUP_ID;
    const group = groupsById.get(groupId);

    return group ? group.enabled : false;
  }
}
