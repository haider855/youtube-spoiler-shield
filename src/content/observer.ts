namespace SpoilerShieldContent {
  const MUTATION_SCAN_DELAY_MS = 250;

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
    return mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some(isRelevantAddedNode)
    );
  }

  function isRelevantAddedNode(node: Node): boolean {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    if (
      node.classList.contains("spoiler-shield-overlay") ||
      Boolean(node.closest(".spoiler-shield-overlay"))
    ) {
      return false;
    }

    return true;
  }
}
