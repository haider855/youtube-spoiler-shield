namespace SpoilerShieldPopup {
  type PopupElements = {
    form: HTMLFormElement;
    input: HTMLInputElement;
    groupSelect: HTMLSelectElement;
    addButton: HTMLButtonElement;
    toggle: HTMLInputElement;
    statusBar: HTMLElement;
    statusDot: HTMLElement;
    statusText: HTMLElement;
    statusStrong: HTMLElement;
    statusDetail: HTMLElement;
    feedbackText: HTMLElement;
    keywordsCount: HTMLElement;
    groupsList: HTMLDivElement;
    keywordsList: HTMLDivElement;
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
      groupSelect: getRequiredElement<HTMLSelectElement>("keyword-group-select"),
      addButton: getRequiredElement<HTMLButtonElement>("add-btn"),
      toggle: getRequiredElement<HTMLInputElement>("protection-toggle"),
      statusBar: getRequiredElement<HTMLElement>("status-bar"),
      statusDot: getRequiredElement<HTMLElement>("status-dot"),
      statusText: getRequiredElement<HTMLElement>("status-text"),
      statusStrong: getRequiredElement<HTMLElement>("status-strong"),
      statusDetail: getRequiredElement<HTMLElement>("status-detail"),
      feedbackText: getRequiredElement<HTMLElement>("feedback-text"),
      keywordsCount: getRequiredElement<HTMLElement>("keywords-count"),
      groupsList: getRequiredElement<HTMLDivElement>("groups-list"),
      keywordsList: getRequiredElement<HTMLDivElement>("keywords-list")
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
    const groupId = popupElements.groupSelect.value;

    setBusy(popupElements, true);
    setFeedback(popupElements, "");

    try {
      currentSettings = await SpoilerShieldShared.addRule(keyword, groupId);
      popupElements.input.value = "";
      renderSettings(popupElements, currentSettings);
      setFeedback(popupElements, "Keyword added.", "success");
    } catch (error) {
      renderSettings(popupElements, currentSettings);
      shakeInput(popupElements);
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
    const activeKeywordCount = safeSettings.rules.filter((rule) =>
      isRuleActive(rule, safeSettings.groups)
    ).length;

    popupElements.toggle.checked = safeSettings.enabled;
    updateStatus(popupElements, safeSettings.enabled, activeKeywordCount);
    renderGroupOptions(popupElements, safeSettings.groups);
    renderGroups(popupElements, safeSettings.groups, safeSettings.rules);
    renderKeywords(popupElements, safeSettings.rules, safeSettings.groups);
  }

  function updateStatus(
    popupElements: PopupElements,
    isProtected: boolean,
    keywordCount: number
  ): void {
    popupElements.statusDot.classList.toggle("off", !isProtected);
    popupElements.statusText.classList.toggle("off", !isProtected);

    if (isProtected) {
      popupElements.statusStrong.textContent = "Active";
      popupElements.statusDetail.textContent = ` - blocking ${keywordCount} keyword${keywordCount === 1 ? "" : "s"}`;
    } else {
      popupElements.statusStrong.textContent = "Paused";
      popupElements.statusDetail.textContent = " - protection disabled";
    }

    popupElements.keywordsCount.textContent = keywordCount > 0 ? `${keywordCount} active` : "none";
  }

  function renderKeywords(
    popupElements: PopupElements,
    rules: SpoilerShieldShared.SpoilerRule[],
    groups: SpoilerShieldShared.SpoilerGroup[]
  ): void {
    if (rules.length === 0) {
      popupElements.keywordsList.replaceChildren(createEmptyState());
      return;
    }

    popupElements.keywordsList.replaceChildren(
      ...rules.map((rule, index) => createRuleChip(rule, index, groups))
    );
  }

  function renderGroupOptions(
    popupElements: PopupElements,
    groups: SpoilerShieldShared.SpoilerGroup[]
  ): void {
    const selectedGroupId = popupElements.groupSelect.value || SpoilerShieldShared.DEFAULT_GROUP_ID;
    const options = groups.map((group) => {
      const option = document.createElement("option");

      option.value = group.id;
      option.textContent = group.name;

      return option;
    });

    popupElements.groupSelect.replaceChildren(...options);
    popupElements.groupSelect.value = groups.some((group) => group.id === selectedGroupId)
      ? selectedGroupId
      : SpoilerShieldShared.DEFAULT_GROUP_ID;
  }

  function renderGroups(
    popupElements: PopupElements,
    groups: SpoilerShieldShared.SpoilerGroup[],
    rules: SpoilerShieldShared.SpoilerRule[]
  ): void {
    popupElements.groupsList.replaceChildren(
      ...groups.map((group) => createGroupControl(group, rules))
    );
  }

  function createGroupControl(
    group: SpoilerShieldShared.SpoilerGroup,
    rules: SpoilerShieldShared.SpoilerRule[]
  ): HTMLDivElement {
    const groupControl = document.createElement("div");
    const groupInfo = document.createElement("div");
    const groupName = document.createElement("span");
    const groupCount = document.createElement("span");
    const groupToggle = document.createElement("button");
    const ruleCount = rules.filter((rule) => rule.groupId === group.id).length;
    const nextEnabled = !group.enabled;

    groupControl.className = "group-control";
    groupControl.classList.toggle("group-control-paused", !group.enabled);
    groupInfo.className = "group-info";
    groupName.className = "group-name";
    groupName.textContent = group.name;
    groupCount.className = "group-count";
    groupCount.textContent = `${ruleCount} keyword${ruleCount === 1 ? "" : "s"}`;
    groupToggle.className = "group-toggle";
    groupToggle.type = "button";
    groupToggle.setAttribute("aria-label", `${group.enabled ? "Pause" : "Resume"} ${group.name} group`);
    groupToggle.setAttribute("title", group.enabled ? "Pause group" : "Resume group");
    groupToggle.innerHTML = group.enabled ? getPauseIconSvg() : getPlayIconSvg();
    groupToggle.addEventListener("click", () => {
      void handleToggleGroup(group.id, nextEnabled);
    });

    groupInfo.append(groupName, groupCount);
    groupControl.append(groupInfo, groupToggle);

    return groupControl;
  }

  function createRuleChip(
    rule: SpoilerShieldShared.SpoilerRule,
    index: number,
    groups: SpoilerShieldShared.SpoilerGroup[]
  ): HTMLDivElement {
    const chip = document.createElement("div");
    const chipLeft = document.createElement("div");
    const chipIndex = document.createElement("span");
    const chipText = document.createElement("span");
    const chipGroup = document.createElement("span");
    const chipActions = document.createElement("div");
    const ruleToggle = createRuleToggle(rule);
    const removeButton = document.createElement("button");
    const group = getRuleGroup(rule, groups);

    chip.className = "keyword-chip";
    chip.classList.toggle("keyword-chip-paused", !isRuleActive(rule, groups));
    chip.dataset.ruleId = rule.id;
    chipLeft.className = "chip-left";
    chipIndex.className = "chip-index";
    chipText.className = "chip-text";
    chipGroup.className = "chip-group";
    chipActions.className = "chip-actions";
    removeButton.className = "chip-remove";
    removeButton.type = "button";

    chipIndex.textContent = String(index + 1).padStart(2, "0");
    chipText.textContent = rule.keyword;
    chipGroup.textContent = group.name;
    removeButton.setAttribute("aria-label", `Remove ${rule.keyword}`);
    removeButton.innerHTML = getCloseIconSvg();
    removeButton.addEventListener("click", () => {
      void handleRemoveKeyword(rule.id);
    });

    chipLeft.append(chipIndex, chipText, chipGroup);
    chipActions.append(ruleToggle, removeButton);
    chip.append(chipLeft, chipActions);

    return chip;
  }

  function createRuleToggle(rule: SpoilerShieldShared.SpoilerRule): HTMLButtonElement {
    const button = document.createElement("button");
    const nextEnabled = !rule.enabled;

    button.className = "chip-toggle";
    button.type = "button";
    button.setAttribute("aria-label", `${rule.enabled ? "Pause" : "Resume"} ${rule.keyword}`);
    button.setAttribute("title", rule.enabled ? "Pause keyword" : "Resume keyword");
    button.innerHTML = rule.enabled ? getPauseIconSvg() : getPlayIconSvg();
    button.addEventListener("click", () => {
      void handleToggleKeyword(rule.id, nextEnabled);
    });

    return button;
  }

  async function handleToggleKeyword(ruleId: string, enabled: boolean): Promise<void> {
    if (!elements) {
      return;
    }

    setBusy(elements, true);
    setFeedback(elements, "");

    try {
      currentSettings = await SpoilerShieldShared.setRuleEnabled(ruleId, enabled);
      renderSettings(elements, currentSettings);
      setFeedback(elements, enabled ? "Keyword resumed." : "Keyword paused.", "success");
    } catch (error) {
      renderSettings(elements, currentSettings);
      setFeedback(elements, getErrorMessage(error), "error");
    } finally {
      setBusy(elements, false);
    }
  }

  async function handleToggleGroup(groupId: string, enabled: boolean): Promise<void> {
    if (!elements) {
      return;
    }

    setBusy(elements, true);
    setFeedback(elements, "");

    try {
      currentSettings = await SpoilerShieldShared.setGroupEnabled(groupId, enabled);
      renderSettings(elements, currentSettings);
      setFeedback(elements, enabled ? "Group resumed." : "Group paused.", "success");
    } catch (error) {
      renderSettings(elements, currentSettings);
      setFeedback(elements, getErrorMessage(error), "error");
    } finally {
      setBusy(elements, false);
    }
  }

  function createEmptyState(): HTMLDivElement {
    const emptyState = document.createElement("div");
    const emptyText = document.createElement("span");

    emptyState.className = "empty-state";
    emptyState.innerHTML = getShieldOffIconSvg();
    emptyText.textContent = "No keywords yet - add one above";
    emptyState.append(emptyText);

    return emptyState;
  }

  function setBusy(popupElements: PopupElements, busy: boolean): void {
    popupElements.statusBar.setAttribute("aria-busy", String(busy));
    popupElements.addButton.disabled = busy;
    popupElements.groupSelect.disabled = busy;
    popupElements.toggle.disabled = busy;
    popupElements.groupsList
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((button) => {
        button.disabled = busy;
      });
    popupElements.keywordsList
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

  function shakeInput(popupElements: PopupElements): void {
    popupElements.input.classList.add("error");
    window.setTimeout(() => {
      popupElements.input.classList.remove("error");
    }, 400);
  }

  function isRuleActive(
    rule: SpoilerShieldShared.SpoilerRule,
    groups: SpoilerShieldShared.SpoilerGroup[]
  ): boolean {
    if (!rule.enabled) {
      return false;
    }

    return getRuleGroup(rule, groups).enabled;
  }

  function getRuleGroup(
    rule: SpoilerShieldShared.SpoilerRule,
    groups: SpoilerShieldShared.SpoilerGroup[]
  ): SpoilerShieldShared.SpoilerGroup {
    return groups.find((group) => group.id === rule.groupId) ?? groups[0] ?? {
      id: SpoilerShieldShared.DEFAULT_GROUP_ID,
      name: "General",
      enabled: true,
      createdAt: 0
    };
  }

  function getCloseIconSvg(): string {
    return [
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
      "</svg>"
    ].join("");
  }

  function getPauseIconSvg(): string {
    return [
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M8 5V19M16 5V19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
      "</svg>"
    ].join("");
  }

  function getPlayIconSvg(): string {
    return [
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M8 5.5V18.5L18 12L8 5.5Z" fill="currentColor"/>',
      "</svg>"
    ].join("");
  }

  function getShieldOffIconSvg(): string {
    return [
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">',
      '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/>',
      '<path d="M17.5 6.5L6.5 17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      "</svg>"
    ].join("");
  }

  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Something went wrong.";
  }

  initializePopup().catch((error: unknown) => {
    const statusStrong = document.getElementById("status-strong");
    const statusDetail = document.getElementById("status-detail");

    if (statusStrong && statusDetail) {
      statusStrong.textContent = "Error";
      statusDetail.textContent = " - unable to load settings";
    }

    console.error("[YouTube Spoiler Shield] Failed to initialize popup.", error);
  });
}
