namespace SpoilerShieldContent {
  const INITIAL_SCAN_DELAYS_MS = [0, 500, 1500, 3000, 6000, 10000];

  type ScanResult = {
    blockedCount: number;
    candidateCount: number;
  };

  export async function initializeContentScript(): Promise<void> {
    const settings = await SpoilerShieldShared.getSettings();

    console.info("[YouTube Spoiler Shield] Content script loaded.");
    console.info(
      `[YouTube Spoiler Shield] Protection ${settings.enabled ? "enabled" : "disabled"} with ${settings.rules.length} keyword(s).`
    );

    scheduleInitialScans(settings);
  }

  function scheduleInitialScans(settings: SpoilerShieldShared.ShieldSettings): void {
    for (const delay of INITIAL_SCAN_DELAYS_MS) {
      window.setTimeout(() => {
        const result = scanCurrentPage(settings);

        console.info(
          `[YouTube Spoiler Shield] Detected ${result.candidateCount} YouTube card candidate(s).`
        );
        console.info(
          `[YouTube Spoiler Shield] Blocked ${result.blockedCount} matching card candidate(s).`
        );
      }, delay);
    }
  }

  function scanCurrentPage(settings: SpoilerShieldShared.ShieldSettings): ScanResult {
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

    return {
      blockedCount,
      candidateCount: candidates.length
    };
  }

  initializeContentScript().catch((error: unknown) => {
    console.error("[YouTube Spoiler Shield] Failed to load settings.", error);
  });
}
