namespace SpoilerShieldContent {
  const INITIAL_SCAN_DELAYS_MS = [0, 500, 1500, 3000, 6000, 10000];

  let currentSettings = SpoilerShieldShared.getDefaultSettings();
  let latestLocationHref = window.location.href;

  type ScanResult = {
    blockedCount: number;
    candidateCount: number;
  };

  export async function initializeContentScript(): Promise<void> {
    currentSettings = await SpoilerShieldShared.getSettings();

    console.info("[YouTube Spoiler Shield] Content script loaded.");
    console.info(
      `[YouTube Spoiler Shield] Protection ${currentSettings.enabled ? "enabled" : "disabled"} with ${currentSettings.rules.length} keyword(s).`
    );

    scheduleInitialScans();
    startYouTubeObserver(scheduleScan);
    listenForSettingsChanges();
  }

  function scheduleInitialScans(): void {
    for (const delay of INITIAL_SCAN_DELAYS_MS) {
      window.setTimeout(() => {
        scheduleScan();
      }, delay);
    }
  }

  export function scheduleScan(): void {
    if (window.location.href !== latestLocationHref) {
      latestLocationHref = window.location.href;
      clearPageRevealMarkers();
    }

    const result = scanCurrentPage(currentSettings);

    console.info(
      `[YouTube Spoiler Shield] Detected ${result.candidateCount} YouTube card candidate(s).`
    );
    console.info(
      `[YouTube Spoiler Shield] Blocked ${result.blockedCount} matching card candidate(s).`
    );
  }

  export function scanCurrentPage(settings: SpoilerShieldShared.ShieldSettings): ScanResult {
    const candidates = findYouTubeCardCandidates();
    let blockedCount = 0;

    for (const candidate of candidates) {
      if (!settings.enabled) {
        unblockCard(candidate.element);
        continue;
      }

      const match = SpoilerShieldShared.matchTextAgainstRules(
        candidate.text,
        settings.rules,
        settings.groups
      );

      if (match.matched) {
        blockCard(candidate.element, match, settings, candidate.kind);
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

  function listenForSettingsChanges(): void {
    chrome?.storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[SpoilerShieldShared.STORAGE_KEY]) {
        return;
      }

      void reloadSettingsAndScan();
    });
  }

  async function reloadSettingsAndScan(): Promise<void> {
    currentSettings = await SpoilerShieldShared.getSettings();
    clearPageRevealMarkers();
    scheduleScan();
  }

  function clearPageRevealMarkers(): void {
    document
      .querySelectorAll<HTMLElement>("[data-spoiler-shield-revealed='true']")
      .forEach((element) => {
        delete element.dataset.spoilerShieldRevealed;
      });
  }

  initializeContentScript().catch((error: unknown) => {
    console.error("[YouTube Spoiler Shield] Failed to load settings.", error);
  });
}
