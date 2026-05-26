namespace SpoilerShieldContent {
  export async function initializeContentScript(): Promise<void> {
    const settings = await SpoilerShieldShared.getSettings();

    console.info("[YouTube Spoiler Shield] Content script loaded.");
    console.info(
      `[YouTube Spoiler Shield] Protection ${settings.enabled ? "enabled" : "disabled"} with ${settings.rules.length} keyword(s).`
    );
  }

  initializeContentScript().catch((error: unknown) => {
    console.error("[YouTube Spoiler Shield] Failed to load settings.", error);
  });
}
