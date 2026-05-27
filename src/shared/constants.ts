namespace SpoilerShieldShared {
  export const STORAGE_KEY = "spoilerShieldSettings";
  export const MAX_KEYWORD_LENGTH = 100;
  export const MAX_RULES = 100;
  export const MAX_GROUP_NAME_LENGTH = 30;
  export const DEFAULT_GROUP_ID = "general";

  export const DEFAULT_GROUPS: SpoilerGroup[] = [
    {
      id: DEFAULT_GROUP_ID,
      name: "General",
      enabled: true,
      createdAt: 0
    },
    {
      id: "anime",
      name: "Anime",
      enabled: true,
      createdAt: 0
    },
    {
      id: "sports",
      name: "Sports",
      enabled: true,
      createdAt: 0
    },
    {
      id: "movies",
      name: "Movies",
      enabled: true,
      createdAt: 0
    }
  ];

  export const DEFAULT_SETTINGS: ShieldSettings = {
    enabled: true,
    blurStrength: 8,
    groups: DEFAULT_GROUPS,
    rules: []
  };
}
