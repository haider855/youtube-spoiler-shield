namespace SpoilerShieldPopup {
  async function initializePopup(): Promise<void> {
    const statusText = document.querySelector<HTMLElement>(".status-text");

    if (!statusText) {
      return;
    }

    const settings = await SpoilerShieldShared.getSettings();

    statusText.textContent = `Protection ${settings.enabled ? "on" : "off"} - ${settings.rules.length} keyword(s) saved.`;
  }

  initializePopup().catch((error: unknown) => {
    const statusText = document.querySelector<HTMLElement>(".status-text");

    if (statusText) {
      statusText.textContent = "Unable to load settings.";
    }

    console.error("[YouTube Spoiler Shield] Failed to initialize popup.", error);
  });
}
