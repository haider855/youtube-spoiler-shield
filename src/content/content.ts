namespace SpoilerShieldContent {
  export async function initializeContentScript(): Promise<void> {
    const settings = await SpoilerShieldShared.getSettings();

    console.info("[YouTube Spoiler Shield] Content script loaded.");
    console.info(
      `[YouTube Spoiler Shield] Protection ${settings.enabled ? "enabled" : "disabled"} with ${settings.rules.length} keyword(s).`
    );

    const candidates = findYouTubeCardCandidates();
    let blockedCount = 0;

    for (const candidate of candidates) {
      if (!settings.enabled) {
        unblockCard(candidate.element);
        continue;
      }

      const match = SpoilerShieldShared.matchTextAgainstRules(candidate.text, settings.rules);

      if (match.matched) {
        blockCard(candidate.element, match, settings);
        blockedCount += 1;
      } else {
        unblockCard(candidate.element);
      }
    }

    console.info(
      `[YouTube Spoiler Shield] Detected ${candidates.length} YouTube card candidate(s).`
    );
    console.info(
      `[YouTube Spoiler Shield] Blocked ${blockedCount} matching card candidate(s).`
    );
  }

  initializeContentScript().catch((error: unknown) => {
    console.error("[YouTube Spoiler Shield] Failed to load settings.", error);
  });
}
