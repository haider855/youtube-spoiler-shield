namespace SpoilerShieldShared {
  export const STORAGE_KEY = "spoilerShieldSettings";
  export const MAX_KEYWORD_LENGTH = 100;
  export const MAX_RULES = 100;

  export const DEFAULT_SETTINGS: ShieldSettings = {
    enabled: true,
    blurStrength: 8,
    rules: []
  };
}
