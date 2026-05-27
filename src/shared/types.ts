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

type ChromeStorageChange = {
  oldValue?: unknown;
  newValue?: unknown;
};

type ChromeStorageChangedEvent = {
  addListener(
    callback: (
      changes: Record<string, ChromeStorageChange>,
      areaName: string
    ) => void
  ): void;
};

declare const chrome:
  | {
      runtime?: ChromeRuntime;
      storage?: {
        local?: ChromeStorageArea;
        onChanged?: ChromeStorageChangedEvent;
      };
    }
  | undefined;

namespace SpoilerShieldShared {
  export type SpoilerGroup = {
    id: string;
    name: string;
    enabled: boolean;
    createdAt: number;
  };

  export type SpoilerRule = {
    id: string;
    keyword: string;
    groupId: string;
    enabled: boolean;
    createdAt: number;
  };

  export type ShieldSettings = {
    enabled: boolean;
    blurStrength: number;
    groups: SpoilerGroup[];
    rules: SpoilerRule[];
  };

  export type MatchResult = {
    matched: boolean;
    keyword?: string;
    ruleId?: string;
  };
}
