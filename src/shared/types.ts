type ChromeStorageResult = Record<string, unknown>;

type ChromeStorageArea = {
  get(
    keys: string | string[] | Record<string, unknown> | null,
    callback: (items: ChromeStorageResult) => void
  ): void;
  set(items: Record<string, unknown>, callback?: () => void): void;
};

type ChromeRuntime = {
  lastError?: {
    message?: string;
  };
};

declare const chrome:
  | {
      runtime?: ChromeRuntime;
      storage?: {
        local?: ChromeStorageArea;
      };
    }
  | undefined;

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
