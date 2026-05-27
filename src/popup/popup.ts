namespace SpoilerShieldPopup {
  type PopupElements = {
    form: HTMLFormElement;
    input: HTMLInputElement;
    groupSelect: HTMLSelectElement;
    addButton: HTMLButtonElement;
    groupForm: HTMLFormElement;
    groupInput: HTMLInputElement;
    addGroupButton: HTMLButtonElement;
    toggle: HTMLInputElement;
    statusBar: HTMLElement;
    statusDot: HTMLElement;
    statusText: HTMLElement;
    statusStrong: HTMLElement;
    statusDetail: HTMLElement;
    feedbackText: HTMLElement;
    keywordsCount: HTMLElement;
    deleteGroupDialog: HTMLDivElement;
    deleteGroupMessage: HTMLParagraphElement;
    deleteGroupCancel: HTMLButtonElement;
    deleteGroupConfirm: HTMLButtonElement;
    keywordContextMenu: HTMLDivElement;
    groupsList: HTMLDivElement;
    keywordsList: HTMLDivElement;
  };

  let elements: PopupElements | undefined;
  let currentSettings: SpoilerShieldShared.ShieldSettings | undefined;
  const selectedRuleIds = new Set<string>();

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
      groupForm: getRequiredElement<HTMLFormElement>("group-form"),
      groupInput: getRequiredElement<HTMLInputElement>("group-input"),
      addGroupButton: getRequiredElement<HTMLButtonElement>("add-group-btn"),
      toggle: getRequiredElement<HTMLInputElement>("protection-toggle"),
      statusBar: getRequiredElement<HTMLElement>("status-bar"),
      statusDot: getRequiredElement<HTMLElement>("status-dot"),
      statusText: getRequiredElement<HTMLElement>("status-text"),
      statusStrong: getRequiredElement<HTMLElement>("status-strong"),
      statusDetail: getRequiredElement<HTMLElement>("status-detail"),
      feedbackText: getRequiredElement<HTMLElement>("feedback-text"),
      keywordsCount: getRequiredElement<HTMLElement>("keywords-count"),
      deleteGroupDialog: getRequiredElement<HTMLDivElement>("delete-group-dialog"),
      deleteGroupMessage: getRequiredElement<HTMLParagraphElement>("delete-group-message"),
      deleteGroupCancel: getRequiredElement<HTMLButtonElement>("delete-group-cancel"),
      deleteGroupConfirm: getRequiredElement<HTMLButtonElement>("delete-group-confirm"),
      keywordContextMenu: getRequiredElement<HTMLDivElement>("keyword-context-menu"),
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

    popupElements.groupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void handleAddGroup(popupElements);
    });

    popupElements.toggle.addEventListener("change", () => {
      void handleToggleProtection(popupElements);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof Node) || popupElements.keywordContextMenu.contains(target)) {
        return;
      }

      clearKeywordSelection(popupElements);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || popupElements.keywordContextMenu.hidden) {
        return;
      }

      event.preventDefault();
      clearKeywordSelection(popupElements);
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

  async function handleAddGroup(popupElements: PopupElements): Promise<void> {
    const groupName = popupElements.groupInput.value;

    setBusy(popupElements, true);
    setFeedback(popupElements, "");

    try {
      currentSettings = await SpoilerShieldShared.addGroup(groupName);
      popupElements.groupInput.value = "";
      renderSettings(popupElements, currentSettings);
      setFeedback(popupElements, "Group added.", "success");
    } catch (error) {
      renderSettings(popupElements, currentSettings);
      shakeGroupInput(popupElements);
      setFeedback(popupElements, getErrorMessage(error), "error");
    } finally {
      setBusy(popupElements, false);
      popupElements.groupInput.focus();
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

    pruneKeywordSelection(safeSettings.rules);
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
      selectedRuleIds.clear();
      closeKeywordContextMenu(popupElements);
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
    const groupActions = document.createElement("div");
    const groupToggle = document.createElement("button");
    const removeButton = document.createElement("button");
    const ruleCount = rules.filter((rule) => rule.groupId === group.id).length;
    const nextEnabled = !group.enabled;

    groupControl.className = "group-control";
    groupControl.classList.toggle("group-control-paused", !group.enabled);
    groupInfo.className = "group-info";
    groupName.className = "group-name";
    groupName.textContent = group.name;
    groupCount.className = "group-count";
    groupCount.textContent = `${ruleCount} keyword${ruleCount === 1 ? "" : "s"}`;
    groupActions.className = "group-actions";
    groupToggle.className = "group-toggle";
    groupToggle.type = "button";
    groupToggle.setAttribute("aria-label", `${group.enabled ? "Pause" : "Resume"} ${group.name} group`);
    groupToggle.setAttribute("title", group.enabled ? "Pause group" : "Resume group");
    groupToggle.innerHTML = group.enabled ? getPauseIconSvg() : getPlayIconSvg();
    groupToggle.addEventListener("click", () => {
      void handleToggleGroup(group.id, nextEnabled);
    });
    removeButton.className = "group-remove";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Delete ${group.name} group`);
    removeButton.setAttribute("title", "Delete group");
    removeButton.innerHTML = getCloseIconSvg();
    removeButton.addEventListener("click", () => {
      void handleRemoveGroup(group.id);
    });

    groupInfo.append(groupName, groupCount);
    groupActions.append(groupToggle);

    if (group.id !== SpoilerShieldShared.DEFAULT_GROUP_ID) {
      groupActions.append(removeButton);
    }

    groupControl.append(groupInfo, groupActions);

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
    chip.classList.toggle("keyword-chip-selected", selectedRuleIds.has(rule.id));
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
    chip.addEventListener("contextmenu", (event) => {
      if (event.target instanceof HTMLElement && event.target.closest("button")) {
        return;
      }

      event.preventDefault();
      handleKeywordContextMenu(event, rule);
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

  function handleKeywordContextMenu(
    event: MouseEvent,
    rule: SpoilerShieldShared.SpoilerRule
  ): void {
    if (!elements || !currentSettings) {
      return;
    }

    selectedRuleIds.add(rule.id);
    renderSettings(elements, currentSettings);
    openKeywordContextMenu(elements, event.clientX, event.clientY);
  }

  function openKeywordContextMenu(
    popupElements: PopupElements,
    clientX: number,
    clientY: number
  ): void {
    const settings = currentSettings;

    if (!settings) {
      return;
    }

    const selectedRules = settings.rules.filter((rule) => selectedRuleIds.has(rule.id));

    if (selectedRules.length === 0) {
      closeKeywordContextMenu(popupElements);
      return;
    }

    popupElements.keywordContextMenu.replaceChildren(
      createKeywordMenuHeader(selectedRules.length),
      createKeywordMenuDivider(),
      createKeywordMenuLabel("Move to group"),
      ...settings.groups.map((group) => createKeywordMoveButton(group, selectedRules)),
      createKeywordMenuDivider(),
      createKeywordClearButton(popupElements)
    );
    popupElements.keywordContextMenu.hidden = false;
    positionKeywordContextMenu(popupElements.keywordContextMenu, clientX, clientY);
  }

  function closeKeywordContextMenu(popupElements: PopupElements): void {
    popupElements.keywordContextMenu.hidden = true;
    popupElements.keywordContextMenu.replaceChildren();
  }

  function clearKeywordSelection(popupElements: PopupElements): void {
    if (selectedRuleIds.size === 0 && popupElements.keywordContextMenu.hidden) {
      return;
    }

    selectedRuleIds.clear();
    closeKeywordContextMenu(popupElements);
    renderSettings(popupElements, currentSettings);
  }

  function pruneKeywordSelection(rules: SpoilerShieldShared.SpoilerRule[]): void {
    const ruleIds = new Set(rules.map((rule) => rule.id));

    selectedRuleIds.forEach((ruleId) => {
      if (!ruleIds.has(ruleId)) {
        selectedRuleIds.delete(ruleId);
      }
    });
  }

  function createKeywordMenuHeader(selectedCount: number): HTMLDivElement {
    const header = document.createElement("div");

    header.className = "keyword-menu-header";
    header.textContent = `${selectedCount} selected`;

    return header;
  }

  function createKeywordMenuLabel(label: string): HTMLDivElement {
    const itemLabel = document.createElement("div");

    itemLabel.className = "keyword-menu-label";
    itemLabel.textContent = label;

    return itemLabel;
  }

  function createKeywordMenuDivider(): HTMLDivElement {
    const divider = document.createElement("div");

    divider.className = "keyword-menu-divider";

    return divider;
  }

  function createKeywordMoveButton(
    group: SpoilerShieldShared.SpoilerGroup,
    selectedRules: SpoilerShieldShared.SpoilerRule[]
  ): HTMLButtonElement {
    const button = document.createElement("button");
    const allSelectedAlreadyInGroup = selectedRules.every((rule) => rule.groupId === group.id);

    button.className = "keyword-menu-item";
    button.type = "button";
    button.disabled = allSelectedAlreadyInGroup;
    button.setAttribute("role", "menuitem");
    button.textContent = group.name;
    button.addEventListener("click", () => {
      void handleMoveSelectedKeywords(group.id);
    });

    return button;
  }

  function createKeywordClearButton(popupElements: PopupElements): HTMLButtonElement {
    const button = document.createElement("button");

    button.className = "keyword-menu-item keyword-menu-clear";
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.textContent = "Clear selection";
    button.addEventListener("click", () => {
      clearKeywordSelection(popupElements);
    });

    return button;
  }

  async function handleMoveSelectedKeywords(groupId: string): Promise<void> {
    if (!elements || !currentSettings) {
      return;
    }

    const ruleIds = Array.from(selectedRuleIds);
    const targetGroup = currentSettings.groups.find((group) => group.id === groupId);
    const movedCount = ruleIds.length;

    setBusy(elements, true);
    setFeedback(elements, "");
    closeKeywordContextMenu(elements);

    try {
      currentSettings = await SpoilerShieldShared.moveRulesToGroup(ruleIds, groupId);
      selectedRuleIds.clear();
      renderSettings(elements, currentSettings);
      setFeedback(
        elements,
        `${movedCount} keyword${movedCount === 1 ? "" : "s"} moved to ${targetGroup?.name ?? "group"}.`,
        "success"
      );
    } catch (error) {
      renderSettings(elements, currentSettings);
      setFeedback(elements, getErrorMessage(error), "error");
    } finally {
      setBusy(elements, false);
    }
  }

  function positionKeywordContextMenu(
    menu: HTMLDivElement,
    clientX: number,
    clientY: number
  ): void {
    const margin = 8;

    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;

    const rect = menu.getBoundingClientRect();
    const left = Math.min(clientX, window.innerWidth - rect.width - margin);
    const top = Math.min(clientY, window.innerHeight - rect.height - margin);

    menu.style.left = `${Math.max(margin, left)}px`;
    menu.style.top = `${Math.max(margin, top)}px`;
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

  async function handleRemoveGroup(groupId: string): Promise<void> {
    if (!elements) {
      return;
    }

    const group = currentSettings?.groups.find((item) => item.id === groupId);

    if (!group) {
      setFeedback(elements, "Group not found.", "error");
      return;
    }

    const confirmed = await confirmGroupDeletion(elements, group);

    if (!confirmed) {
      setFeedback(elements, "");
      return;
    }

    setBusy(elements, true);
    setFeedback(elements, "");

    try {
      currentSettings = await SpoilerShieldShared.removeGroup(groupId);
      renderSettings(elements, currentSettings);
      setFeedback(elements, "Group deleted. Keywords moved to General.", "success");
    } catch (error) {
      renderSettings(elements, currentSettings);
      setFeedback(elements, getErrorMessage(error), "error");
    } finally {
      setBusy(elements, false);
    }
  }

  function confirmGroupDeletion(
    popupElements: PopupElements,
    group: SpoilerShieldShared.SpoilerGroup
  ): Promise<boolean> {
    const ruleCount = currentSettings?.rules.filter((rule) => rule.groupId === group.id).length ?? 0;
    const keywordLabel = ruleCount === 1 ? "keyword" : "keywords";

    popupElements.deleteGroupMessage.textContent =
      `Delete "${group.name}"? ${ruleCount} ${keywordLabel} will move to General.`;
    popupElements.deleteGroupDialog.hidden = false;

    return new Promise((resolve) => {
      const closeDialog = (confirmed: boolean): void => {
        popupElements.deleteGroupDialog.hidden = true;
        popupElements.deleteGroupCancel.removeEventListener("click", handleCancel);
        popupElements.deleteGroupConfirm.removeEventListener("click", handleConfirm);
        popupElements.deleteGroupDialog.removeEventListener("click", handleBackdropClick);
        document.removeEventListener("keydown", handleKeydown);
        resolve(confirmed);
      };

      const handleCancel = (): void => {
        closeDialog(false);
      };

      const handleConfirm = (): void => {
        closeDialog(true);
      };

      const handleBackdropClick = (event: MouseEvent): void => {
        if (event.target === popupElements.deleteGroupDialog) {
          closeDialog(false);
        }
      };

      const handleKeydown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          closeDialog(false);
        }
      };

      popupElements.deleteGroupCancel.addEventListener("click", handleCancel);
      popupElements.deleteGroupConfirm.addEventListener("click", handleConfirm);
      popupElements.deleteGroupDialog.addEventListener("click", handleBackdropClick);
      document.addEventListener("keydown", handleKeydown);
      popupElements.deleteGroupCancel.focus();
    });
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
    popupElements.groupInput.disabled = busy;
    popupElements.addGroupButton.disabled = busy;
    popupElements.toggle.disabled = busy;
    popupElements.deleteGroupCancel.disabled = busy;
    popupElements.deleteGroupConfirm.disabled = busy;
    popupElements.keywordContextMenu
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((button) => {
        button.disabled = busy;
      });
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

  function shakeGroupInput(popupElements: PopupElements): void {
    popupElements.groupInput.classList.add("error");
    window.setTimeout(() => {
      popupElements.groupInput.classList.remove("error");
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
