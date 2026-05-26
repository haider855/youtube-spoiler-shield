namespace SpoilerShieldShared {
  export type SpoilerRule = {
    id: string;
    keyword: string;
    enabled: boolean;
    createdAt: number;
  };

  export type ShieldSettings = {
    enabled: boolean;
    blurStrength: number;
    rules: SpoilerRule[];
  };

  export type MatchResult = {
    matched: boolean;
    keyword?: string;
    ruleId?: string;
  };
}
