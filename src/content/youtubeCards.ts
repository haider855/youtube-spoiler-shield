namespace SpoilerShieldContent {
  export type YouTubeCardCandidate = {
    element: HTMLElement;
    kind: YouTubeCardKind;
    text: string;
  };

  export type YouTubeCardKind = "video" | "shorts";

  type YouTubeCardElement = {
    element: HTMLElement;
    kind: YouTubeCardKind;
  };

  export const YOUTUBE_CARD_SELECTORS = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-reel-item-renderer",
    "ytd-reel-video-renderer",
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
    "yt-formatted-string[role='heading']",
    "#video-title-link",
    "h2 a",
    "h2",
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
      .map((cardElement) => ({
        element: cardElement.element,
        kind: cardElement.kind,
        text: extractYouTubeCardText(cardElement.element)
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
      textParts.push(readTextWithAttributes(card));
    }

    return compactWhitespace(textParts.join(" "));
  }

  function findUniqueCardElements(root: ParentNode): YouTubeCardElement[] {
    const cardElements: YouTubeCardElement[] = [];

    for (const selector of YOUTUBE_CARD_SELECTORS) {
      root.querySelectorAll(selector).forEach((element) => {
        if (!isHTMLElement(element) || !isVisibleElement(element)) {
          return;
        }

        if (cardElements.some((cardElement) => cardElement.element.contains(element))) {
          return;
        }

        removeNestedCandidates(cardElements, element);
        cardElements.push({
          element,
          kind: getYouTubeCardKind(element)
        });
      });
    }

    return cardElements;
  }

  function removeNestedCandidates(cardElements: YouTubeCardElement[], element: HTMLElement): void {
    for (let index = cardElements.length - 1; index >= 0; index -= 1) {
      const existingElement = cardElements[index];

      if (existingElement && element.contains(existingElement.element)) {
        cardElements.splice(index, 1);
      }
    }
  }

  function getYouTubeCardKind(element: HTMLElement): YouTubeCardKind {
    if (
      matchesShortsCardSelector(element) ||
      Boolean(element.closest("ytd-reel-shelf-renderer, ytd-shorts, ytd-shorts-rich-section-renderer")) ||
      Boolean(element.querySelector("a[href*='/shorts/']"))
    ) {
      return "shorts";
    }

    return "video";
  }

  function matchesShortsCardSelector(element: HTMLElement): boolean {
    return element.matches([
      "ytd-reel-item-renderer",
      "ytd-reel-video-renderer",
      "ytd-rich-grid-slim-media",
      "ytm-shorts-lockup-view-model",
      "ytm-shorts-lockup-view-model-v2",
      "yt-shorts-lockup-view-model"
    ].join(", "));
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

        const text = includeTextAttributes ? readTextWithAttributes(element) : readVisibleText(element);

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

  function readTextWithAttributes(element: HTMLElement): string {
    return compactWhitespace([
      element.innerText || element.textContent || "",
      element.getAttribute("aria-label") ?? "",
      element.getAttribute("title") ?? ""
    ].join(" "));
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
