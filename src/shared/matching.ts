namespace SpoilerShieldShared {
  export function normalizeText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }

  export function createEmptyMatchResult(): MatchResult {
    return { matched: false };
  }
}
