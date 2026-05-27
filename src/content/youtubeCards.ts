namespace SpoilerShieldContent {
  export type YouTubeCardCandidate = {
    element: HTMLElement;
    text: string;
  };

  export const YOUTUBE_CARD_SELECTORS = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-reel-item-renderer",
    "ytd-rich-grid-media",
    "ytd-rich-grid-slim-media",
    "ytm-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model-v2",
    "yt-shorts-lockup-view-model",
    "yt-lockup-view-model"
  ];

  const TITLE_SELECTORS = [
    "a#video-title",
    "#video-title",
    "yt-formatted-string#video-title",
    "#video-title-link",
    "h3 a",
    "h3",
    "a[href*='/watch']",
    "a[href*='/shorts/']"
  ];

  const CHANNEL_SELECTORS = [
    "#channel-name",
    "ytd-channel-name",
    "yt-formatted-string.ytd-channel-name",
    "a[href^='/@']",
    "a[href^='/channel/']"
  ];

  const METADATA_SELECTORS = [
    "#metadata-line",
    "ytd-video-meta-block",
    ".metadata-snippet-container",
    "yt-formatted-string[aria-label]"
  ];

  export function findYouTubeCardCandidates(root: ParentNode = document): YouTubeCardCandidate[] {
    return findUniqueCardElements(root)
      .map((element) => ({
        element,
        text: extractYouTubeCardText(element)
      }))
      .filter((candidate) => candidate.text.length > 0);
  }

  export function extractYouTubeCardText(card: HTMLElement): string {
    const textParts = [
      ...collectElementTexts(card, TITLE_SELECTORS, true),
      ...collectElementTexts(card, CHANNEL_SELECTORS, false),
      ...collectElementTexts(card, METADATA_SELECTORS, false)
    ];

    if (textParts.length === 0) {
      textParts.push(readVisibleText(card));
    }

    return compactWhitespace(textParts.join(" "));
  }

  function findUniqueCardElements(root: ParentNode): HTMLElement[] {
    const cardElements: HTMLElement[] = [];

    for (const selector of YOUTUBE_CARD_SELECTORS) {
      root.querySelectorAll(selector).forEach((element) => {
        if (!isHTMLElement(element) || !isVisibleElement(element)) {
          return;
        }

        if (cardElements.some((cardElement) => cardElement.contains(element))) {
          return;
        }

        removeNestedCandidates(cardElements, element);
        cardElements.push(element);
      });
    }

    return cardElements;
  }

  function removeNestedCandidates(cardElements: HTMLElement[], element: HTMLElement): void {
    for (let index = cardElements.length - 1; index >= 0; index -= 1) {
      const existingElement = cardElements[index];

      if (existingElement && element.contains(existingElement)) {
        cardElements.splice(index, 1);
      }
    }
  }

  function collectElementTexts(
    card: HTMLElement,
    selectors: string[],
    includeTextAttributes: boolean
  ): string[] {
    const textParts: string[] = [];
    const seenText = new Set<string>();

    for (const selector of selectors) {
      card.querySelectorAll(selector).forEach((element) => {
        if (!isHTMLElement(element) || !isVisibleElement(element)) {
          return;
        }

        const text = includeTextAttributes
          ? compactWhitespace([
              readVisibleText(element),
              element.getAttribute("title") ?? "",
              element.getAttribute("aria-label") ?? ""
            ].join(" "))
          : readVisibleText(element);

        if (!text || seenText.has(text)) {
          return;
        }

        seenText.add(text);
        textParts.push(text);
      });
    }

    return textParts;
  }

  function readVisibleText(element: HTMLElement): string {
    return compactWhitespace(element.innerText || element.textContent || "");
  }

  function compactWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  function isHTMLElement(element: Element): element is HTMLElement {
    return element instanceof HTMLElement;
  }

  function isVisibleElement(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }

    return element.getClientRects().length > 0;
  }
}
