namespace SpoilerShieldContent {
  const BLOCKED_CLASS = "spoiler-shield-blocked";
  const OVERLAY_CLASS = "spoiler-shield-overlay";
  const OVERLAY_TITLE_CLASS = "spoiler-shield-overlay-title";
  const OVERLAY_MATCH_CLASS = "spoiler-shield-overlay-match";
  const REVEAL_BUTTON_CLASS = "spoiler-shield-reveal-button";

  export function blockCard(
    card: HTMLElement,
    match: SpoilerShieldShared.MatchResult,
    settings: SpoilerShieldShared.ShieldSettings
  ): void {
    if (!match.matched || card.dataset.spoilerShieldRevealed === "true") {
      return;
    }

    card.dataset.spoilerShieldProcessed = "true";
    card.dataset.spoilerShieldBlocked = "true";
    card.dataset.spoilerShieldRuleId = match.ruleId ?? "";
    card.dataset.spoilerShieldKeyword = match.keyword ?? "";
    card.style.setProperty("--spoiler-shield-blur", `${settings.blurStrength}px`);
    card.classList.add(BLOCKED_CLASS);

    renderOverlay(card, match.keyword ?? "keyword");
  }

  export function unblockCard(card: HTMLElement): void {
    card.dataset.spoilerShieldProcessed = "true";
    card.classList.remove(BLOCKED_CLASS);
    card.dataset.spoilerShieldBlocked = "false";
    card.style.removeProperty("--spoiler-shield-blur");
    removeOverlay(card);
  }

  export function revealCard(card: HTMLElement): void {
    card.dataset.spoilerShieldRevealed = "true";
    unblockCard(card);
  }

  function renderOverlay(card: HTMLElement, keyword: string): void {
    const overlay = getOrCreateOverlay(card);
    const content = document.createElement("div");
    const title = document.createElement("div");
    const matchText = document.createElement("div");
    const revealButton = document.createElement("button");

    content.className = "spoiler-shield-overlay-content";
    title.className = OVERLAY_TITLE_CLASS;
    title.textContent = "Spoiler blocked";
    matchText.className = OVERLAY_MATCH_CLASS;
    matchText.textContent = `Matched: "${keyword}"`;
    revealButton.className = REVEAL_BUTTON_CLASS;
    revealButton.type = "button";
    revealButton.textContent = "Reveal";
    revealButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      revealCard(card);
    });

    content.append(title, matchText, revealButton);
    overlay.replaceChildren(content);
  }

  function getOrCreateOverlay(card: HTMLElement): HTMLElement {
    const existingOverlay = findDirectOverlay(card);

    if (existingOverlay) {
      return existingOverlay;
    }

    const overlay = document.createElement("div");

    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute("role", "group");
    overlay.setAttribute("aria-label", "Spoiler blocked");
    card.append(overlay);

    return overlay;
  }

  function findDirectOverlay(card: HTMLElement): HTMLElement | undefined {
    return Array.from(card.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.classList.contains(OVERLAY_CLASS)
    );
  }

  function removeOverlay(card: HTMLElement): void {
    findDirectOverlay(card)?.remove();
  }
}
