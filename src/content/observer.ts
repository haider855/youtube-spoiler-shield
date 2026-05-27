namespace SpoilerShieldContent {
  const MUTATION_SCAN_DELAY_MS = 250;
  const MUTATION_ATTRIBUTE_FILTER = ["aria-label", "hidden", "href", "title"];
  const MUTATION_CONTEXT_SELECTORS = [
    ...YOUTUBE_CARD_SELECTORS,
    "ytd-search",
    "ytd-section-list-renderer",
    "ytd-item-section-renderer",
    "ytd-continuation-item-renderer",
    "ytd-two-column-search-results-renderer",
    "ytd-search-sub-menu-renderer",
    "ytd-feed-filter-chip-bar-renderer",
    "yt-chip-cloud-renderer"
  ].join(", ");

  let observer: MutationObserver | undefined;
  let scanTimeoutId: number | undefined;

  export function startYouTubeObserver(scheduleScan: () => void): void {
    stopYouTubeObserver();

    observer = new MutationObserver((mutations) => {
      if (!hasRelevantMutation(mutations)) {
        return;
      }

      scheduleDebouncedScan(scheduleScan);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: MUTATION_ATTRIBUTE_FILTER,
      characterData: true,
      childList: true,
      subtree: true
    });
  }

  export function stopYouTubeObserver(): void {
    observer?.disconnect();
    observer = undefined;

    if (scanTimeoutId !== undefined) {
      window.clearTimeout(scanTimeoutId);
      scanTimeoutId = undefined;
    }
  }

  function scheduleDebouncedScan(scheduleScan: () => void): void {
    if (scanTimeoutId !== undefined) {
      window.clearTimeout(scanTimeoutId);
    }

    scanTimeoutId = window.setTimeout(() => {
      scanTimeoutId = undefined;
      scheduleScan();
    }, MUTATION_SCAN_DELAY_MS);
  }

  function hasRelevantMutation(mutations: MutationRecord[]): boolean {
    return mutations.some((mutation) => {
      if (isIgnoredMutationTarget(mutation.target)) {
        return false;
      }

      if (mutation.type === "childList") {
        return (
          Array.from(mutation.addedNodes).some(isRelevantAddedNode) ||
          Array.from(mutation.removedNodes).some(isRelevantRemovedNode)
        );
      }

      if (mutation.type === "attributes" || mutation.type === "characterData") {
        return isRelevantMutationTarget(mutation.target);
      }

      return false;
    });
  }

  function isRelevantAddedNode(node: Node): boolean {
    if (isIgnoredNode(node)) {
      return false;
    }

    if (!(node instanceof HTMLElement)) {
      return false;
    }

    return (
      node.matches(MUTATION_CONTEXT_SELECTORS) ||
      Boolean(node.querySelector(MUTATION_CONTEXT_SELECTORS))
    );
  }

  function isRelevantRemovedNode(node: Node): boolean {
    if (isIgnoredNode(node) || !(node instanceof HTMLElement)) {
      return false;
    }

    return (
      node.matches(MUTATION_CONTEXT_SELECTORS) ||
      Boolean(node.querySelector(MUTATION_CONTEXT_SELECTORS))
    );
  }

  function isRelevantMutationTarget(target: Node): boolean {
    const element = getMutationElement(target);

    if (!element || isIgnoredNode(element)) {
      return false;
    }

    return Boolean(element.closest(MUTATION_CONTEXT_SELECTORS));
  }

  function isIgnoredMutationTarget(target: Node): boolean {
    const element = getMutationElement(target);

    return element ? isIgnoredNode(element) : false;
  }

  function isIgnoredNode(node: Node): boolean {
    const element = getMutationElement(node);

    return Boolean(
      element &&
        (
          element.classList.contains("spoiler-shield-overlay") ||
          Boolean(element.closest(".spoiler-shield-overlay"))
        )
    );
  }

  function getMutationElement(node: Node): HTMLElement | undefined {
    if (node instanceof HTMLElement) {
      return node;
    }

    return node.parentElement ?? undefined;
  }
}
