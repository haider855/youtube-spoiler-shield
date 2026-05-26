namespace SpoilerShieldPopup {
  function initializePopup(): void {
    const statusText = document.querySelector<HTMLElement>(".status-text");

    if (statusText) {
      statusText.textContent = "Extension popup loaded.";
    }
  }

  initializePopup();
}
