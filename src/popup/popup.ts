namespace SpoilerShieldPopup {
  type PopupElements = {
    form: HTMLFormElement;
    input: HTMLInputElement;
    addButton: HTMLButtonElement;
    toggle: HTMLInputElement;
    toggleState: HTMLElement;
    statusText: HTMLElement;
    feedbackText: HTMLElement;
    keywordList: HTMLUListElement;
    emptyState: HTMLElement;
  };

  let elements: PopupElements | undefined;
  let currentSettings: SpoilerShieldShared.ShieldSettings | undefined;

  async function initializePopup(): Promise<void> {
    elements = getPopupElements();
    bindEvents(elements);

    setBusy(elements, true);

    try {
      currentSettings = await SpoilerShieldShared.getSettings();
      renderSettings(elements, currentSettings);
      setFeedback(elements, "");
    } finally {
      setBusy(elements, false);
    }
  }

  function getPopupElements(): PopupElements {
    return {
      form: getRequiredElement<HTMLFormElement>("keyword-form"),
      input: getRequiredElement<HTMLInputElement>("keyword-input"),
      addButton: getRequiredElement<HTMLButtonElement>("add-keyword-button"),
      toggle: getRequiredElement<HTMLInputElement>("protection-toggle"),
      toggleState: getRequiredElement<HTMLElement>("toggle-state"),
      statusText: getRequiredElement<HTMLElement>("status-text"),
      feedbackText: getRequiredElement<HTMLElement>("feedback-text"),
      keywordList: getRequiredElement<HTMLUListElement>("keyword-list"),
      emptyState: getRequiredElement<HTMLElement>("empty-state")
    };
  }

  function getRequiredElement<TElement extends HTMLElement>(id: string): TElement {
    const element = document.getElementById(id);

    if (!element) {
      throw new Error(`Missing popup element: ${id}`);
    }

    return element as TElement;
  }

  function bindEvents(popupElements: PopupElements): void {
    popupElements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      void handleAddKeyword(popupElements);
    });

    popupElements.toggle.addEventListener("change", () => {
      void handleToggleProtection(popupElements);
    });
  }

  async function handleAddKeyword(popupElements: PopupElements): Promise<void> {
    const keyword = popupElements.input.value;

    setBusy(popupElements, true);
    setFeedback(popupElements, "");

    try {
      currentSettings = await SpoilerShieldShared.addRule(keyword);
      popupElements.input.value = "";
      renderSettings(popupElements, currentSettings);
      setFeedback(popupElements, "Keyword added.", "success");
    } catch (error) {
      renderSettings(popupElements, currentSettings);
      setFeedback(popupElements, getErrorMessage(error), "error");
    } finally {
      setBusy(popupElements, false);
      popupElements.input.focus();
    }
  }

  async function handleToggleProtection(popupElements: PopupElements): Promise<void> {
    const nextEnabled = popupElements.toggle.checked;

    setBusy(popupElements, true);
    setFeedback(popupElements, "");

    try {
      currentSettings = await SpoilerShieldShared.setEnabled(nextEnabled);
      renderSettings(popupElements, currentSettings);
    } catch (error) {
      renderSettings(popupElements, currentSettings);
      setFeedback(popupElements, getErrorMessage(error), "error");
    } finally {
      setBusy(popupElements, false);
    }
  }

  async function handleRemoveKeyword(ruleId: string): Promise<void> {
    if (!elements) {
      return;
    }

    setBusy(elements, true);
    setFeedback(elements, "");

    try {
      currentSettings = await SpoilerShieldShared.removeRule(ruleId);
      renderSettings(elements, currentSettings);
      setFeedback(elements, "Keyword removed.", "success");
    } catch (error) {
      renderSettings(elements, currentSettings);
      setFeedback(elements, getErrorMessage(error), "error");
    } finally {
      setBusy(elements, false);
    }
  }

  function renderSettings(
    popupElements: PopupElements,
    settings: SpoilerShieldShared.ShieldSettings | undefined
  ): void {
    const safeSettings = settings ?? SpoilerShieldShared.getDefaultSettings();
    const keywordCount = safeSettings.rules.length;

    popupElements.toggle.checked = safeSettings.enabled;
    popupElements.toggleState.textContent = safeSettings.enabled ? "On" : "Off";
    popupElements.statusText.textContent = `Protection ${safeSettings.enabled ? "on" : "off"} - ${keywordCount} keyword(s) saved.`;
    popupElements.emptyState.hidden = keywordCount > 0;
    popupElements.keywordList.replaceChildren(
      ...safeSettings.rules.map((rule) => createRuleListItem(rule))
    );
  }

  function createRuleListItem(rule: SpoilerShieldShared.SpoilerRule): HTMLLIElement {
    const listItem = document.createElement("li");
    const keywordText = document.createElement("span");
    const removeButton = document.createElement("button");

    listItem.className = "keyword-item";
    keywordText.className = "keyword-text";
    keywordText.textContent = rule.keyword;
    removeButton.className = "remove-keyword-button";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${rule.keyword}`);
    removeButton.addEventListener("click", () => {
      void handleRemoveKeyword(rule.id);
    });

    listItem.append(keywordText, removeButton);

    return listItem;
  }

  function setBusy(popupElements: PopupElements, busy: boolean): void {
    popupElements.addButton.disabled = busy;
    popupElements.toggle.disabled = busy;
    popupElements.keywordList
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((button) => {
        button.disabled = busy;
      });
  }

  function setFeedback(
    popupElements: PopupElements,
    message: string,
    tone: "error" | "success" | "" = ""
  ): void {
    popupElements.feedbackText.textContent = message;
    popupElements.feedbackText.dataset.tone = tone;
  }

  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Something went wrong.";
  }

  initializePopup().catch((error: unknown) => {
    const statusText = document.getElementById("status-text");

    if (statusText) {
      statusText.textContent = "Unable to load settings.";
    }

    console.error("[YouTube Spoiler Shield] Failed to initialize popup.", error);
  });
}
