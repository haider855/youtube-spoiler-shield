namespace SpoilerShieldShared {
  export function getDefaultSettings(): ShieldSettings {
    return {
      enabled: DEFAULT_SETTINGS.enabled,
      blurStrength: DEFAULT_SETTINGS.blurStrength,
      rules: []
    };
  }
}
