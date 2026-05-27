namespace SpoilerShieldContent {
  const INITIAL_SCAN_DELAYS_MS = [0, 500, 1500, 3000, 6000, 10000];
  const PAGE_UPDATE_SCAN_DELAYS_MS = [0, 250, 750, 1500, 3000];
  const YOUTUBE_PAGE_UPDATE_EVENTS = [
    "yt-navigate-finish",
    "yt-page-data-updated",
    "yt-page-type-changed"
  ];
  const BLOCKED_CARD_SELECTOR = ".spoiler-shield-blocked, [data-spoiler-shield-blocked='true']";

  let currentSettings = SpoilerShieldShared.getDefaultSettings();
  let latestLocationHref = window.location.href;
  let pageUpdateScanTimeoutIds: number[] = [];

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
    listenForYouTubePageUpdates();
    listenForSettingsChanges();
  }

  function scheduleInitialScans(): void {
    for (const delay of INITIAL_SCAN_DELAYS_MS) {
      window.setTimeout(() => {
        scheduleScan();
      }, delay);
    }
  }

  function schedulePageUpdateScans(): void {
    clearPageUpdateScanTimeouts();

    for (const delay of PAGE_UPDATE_SCAN_DELAYS_MS) {
      const timeoutId = window.setTimeout(() => {
        pageUpdateScanTimeoutIds = pageUpdateScanTimeoutIds.filter((id) => id !== timeoutId);
        scheduleScan();
      }, delay);

      pageUpdateScanTimeoutIds.push(timeoutId);
    }
  }

  function clearPageUpdateScanTimeouts(): void {
    for (const timeoutId of pageUpdateScanTimeoutIds) {
      window.clearTimeout(timeoutId);
    }

    pageUpdateScanTimeoutIds = [];
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
    const scannedElements = new Set<HTMLElement>();
    let blockedCount = 0;

    for (const candidate of candidates) {
      scannedElements.add(candidate.element);
      candidate.element.dataset.spoilerShieldText = candidate.text;

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

    reconcileUnscannedBlockedCards(settings, scannedElements);

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

  function listenForYouTubePageUpdates(): void {
    for (const eventName of YOUTUBE_PAGE_UPDATE_EVENTS) {
      document.addEventListener(eventName, schedulePageUpdateScans);
    }

    window.addEventListener("popstate", schedulePageUpdateScans);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        schedulePageUpdateScans();
      }
    });
  }

  async function reloadSettingsAndScan(): Promise<void> {
    currentSettings = await SpoilerShieldShared.getSettings();
    clearPageRevealMarkers();
    reconcileBlockedCards(currentSettings);
    scheduleScan();
  }

  function reconcileBlockedCards(settings: SpoilerShieldShared.ShieldSettings): void {
    reconcileUnscannedBlockedCards(settings, new Set<HTMLElement>());
  }

  function reconcileUnscannedBlockedCards(
    settings: SpoilerShieldShared.ShieldSettings,
    scannedElements: Set<HTMLElement>
  ): void {
    document.querySelectorAll<HTMLElement>(BLOCKED_CARD_SELECTOR).forEach((card) => {
      if (scannedElements.has(card)) {
        return;
      }

      if (!settings.enabled) {
        unblockCard(card);
        return;
      }

      const text = card.dataset.spoilerShieldText || extractYouTubeCardText(card);
      const match = SpoilerShieldShared.matchTextAgainstRules(text, settings.rules, settings.groups);

      if (match.matched) {
        blockCard(card, match, settings, getStoredCardKind(card));
      } else {
        unblockCard(card);
      }
    });
  }

  function getStoredCardKind(card: HTMLElement): YouTubeCardKind {
    return card.dataset.spoilerShieldKind === "shorts" ? "shorts" : "video";
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
