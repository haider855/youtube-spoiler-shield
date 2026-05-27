namespace SpoilerShieldPopup {
  type PopupPage = "keywords" | "groups" | "settings";

  type PopupElements = {
    pageTabs: HTMLButtonElement[];
    pagePanels: HTMLElement[];
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
    selectAllControl: HTMLLabelElement;
    bulkSelectAll: HTMLInputElement;
    deleteGroupDialog: HTMLDivElement;
    deleteGroupMessage: HTMLParagraphElement;
    deleteGroupCancel: HTMLButtonElement;
    deleteGroupConfirm: HTMLButtonElement;
    bulkActions: HTMLDivElement;
    bulkCount: HTMLSpanElement;
    bulkGroupSelect: HTMLSelectElement;
    bulkMoveButton: HTMLButtonElement;
    bulkClearButton: HTMLButtonElement;
    exportBackupButton: HTMLButtonElement;
    importBackupButton: HTMLButtonElement;
    backupImportInput: HTMLInputElement;
    groupsList: HTMLDivElement;
    groupDetailTitle: HTMLElement;
    groupDetailCount: HTMLElement;
    groupKeywordsList: HTMLDivElement;
    keywordsList: HTMLDivElement;
  };

  let elements: PopupElements | undefined;
  let currentSettings: SpoilerShieldShared.ShieldSettings | undefined;
  let activePage: PopupPage = "keywords";
  let selectedGroupId = SpoilerShieldShared.DEFAULT_GROUP_ID;
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
      pageTabs: getRequiredElements<HTMLButtonElement>("[data-page-tab]"),
      pagePanels: getRequiredElements<HTMLElement>("[data-page-panel]"),
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
      selectAllControl: getRequiredElement<HTMLLabelElement>("select-all-control"),
      bulkSelectAll: getRequiredElement<HTMLInputElement>("bulk-select-all"),
      deleteGroupDialog: getRequiredElement<HTMLDivElement>("delete-group-dialog"),
      deleteGroupMessage: getRequiredElement<HTMLParagraphElement>("delete-group-message"),
      deleteGroupCancel: getRequiredElement<HTMLButtonElement>("delete-group-cancel"),
      deleteGroupConfirm: getRequiredElement<HTMLButtonElement>("delete-group-confirm"),
      bulkActions: getRequiredElement<HTMLDivElement>("bulk-actions"),
      bulkCount: getRequiredElement<HTMLSpanElement>("bulk-count"),
      bulkGroupSelect: getRequiredElement<HTMLSelectElement>("bulk-group-select"),
      bulkMoveButton: getRequiredElement<HTMLButtonElement>("bulk-move-btn"),
      bulkClearButton: getRequiredElement<HTMLButtonElement>("bulk-clear-btn"),
      exportBackupButton: getRequiredElement<HTMLButtonElement>("export-backup-btn"),
      importBackupButton: getRequiredElement<HTMLButtonElement>("import-backup-btn"),
      backupImportInput: getRequiredElement<HTMLInputElement>("backup-import-input"),
      groupsList: getRequiredElement<HTMLDivElement>("groups-list"),
      groupDetailTitle: getRequiredElement<HTMLElement>("group-detail-title"),
      groupDetailCount: getRequiredElement<HTMLElement>("group-detail-count"),
      groupKeywordsList: getRequiredElement<HTMLDivElement>("group-keywords-list"),
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

  function getRequiredElements<TElement extends HTMLElement>(selector: string): TElement[] {
    const nodeList = Array.from(document.querySelectorAll<TElement>(selector));

    if (nodeList.length === 0) {
      throw new Error(`Missing popup elements: ${selector}`);
    }

    return nodeList;
  }

  function bindEvents(popupElements: PopupElements): void {
    popupElements.pageTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const page = getPopupPage(tab.dataset.pageTab);

        if (page) {
          handlePageChange(page);
        }
      });
    });

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

    popupElements.bulkMoveButton.addEventListener("click", () => {
      void handleMoveSelectedKeywords(popupElements.bulkGroupSelect.value);
    });

    popupElements.bulkClearButton.addEventListener("click", () => {
      clearKeywordSelection(popupElements);
    });

    popupElements.bulkSelectAll.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    popupElements.bulkSelectAll.addEventListener("change", () => {
      handleSelectAllKeywords(popupElements.bulkSelectAll.checked);
    });

    popupElements.exportBackupButton.addEventListener("click", () => {
      void handleExportBackup(popupElements);
    });

    popupElements.importBackupButton.addEventListener("click", () => {
      popupElements.backupImportInput.value = "";
      popupElements.backupImportInput.click();
    });

    popupElements.backupImportInput.addEventListener("change", () => {
      void handleImportBackup(popupElements);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;

      if (
        !(target instanceof HTMLElement) ||
        popupElements.bulkActions.contains(target) ||
        Boolean(target.closest(".keyword-chip")) ||
        Boolean(target.closest(".select-all-control"))
      ) {
        return;
      }

      clearKeywordSelection(popupElements);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || selectedRuleIds.size === 0) {
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
      selectedGroupId = findGroupByName(currentSettings.groups, groupName)?.id ?? selectedGroupId;
      activePage = "groups";
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

  async function handleExportBackup(popupElements: PopupElements): Promise<void> {
    setBusy(popupElements, true);
    setFeedback(popupElements, "");

    try {
      const settings = currentSettings ?? await SpoilerShieldShared.getSettings();
      const backup = SpoilerShieldShared.createSettingsBackup(settings);
      const fileName = `youtube-spoiler-shield-backup-${getBackupDateStamp()}.json`;
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json"
      }));
      const downloadLink = document.createElement("a");

      downloadLink.href = url;
      downloadLink.download = fileName;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
      setFeedback(popupElements, "Backup exported.", "success");
    } catch (error) {
      setFeedback(popupElements, getErrorMessage(error), "error");
    } finally {
      setBusy(popupElements, false);
    }
  }

  async function handleImportBackup(popupElements: PopupElements): Promise<void> {
    const file = popupElements.backupImportInput.files?.[0];

    if (!file) {
      return;
    }

    const confirmed = window.confirm(
      "Import this backup? Current groups and keywords will be replaced."
    );

    if (!confirmed) {
      popupElements.backupImportInput.value = "";
      return;
    }

    setBusy(popupElements, true);
    setFeedback(popupElements, "");

    try {
      const backup = JSON.parse(await file.text()) as unknown;

      currentSettings = await SpoilerShieldShared.importSettingsBackup(backup);
      selectedRuleIds.clear();
      selectedGroupId = SpoilerShieldShared.DEFAULT_GROUP_ID;
      renderSettings(popupElements, currentSettings);
      setFeedback(popupElements, "Backup imported.", "success");
    } catch (error) {
      renderSettings(popupElements, currentSettings);
      setFeedback(popupElements, getImportErrorMessage(error), "error");
    } finally {
      popupElements.backupImportInput.value = "";
      setBusy(popupElements, false);
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
    renderBulkActions(popupElements, safeSettings);
    renderSelectAllControl(popupElements, safeSettings.rules);
    renderActivePage(popupElements);
  }

  function renderActivePage(popupElements: PopupElements): void {
    popupElements.pageTabs.forEach((tab) => {
      const page = getPopupPage(tab.dataset.pageTab);
      const isActive = page === activePage;

      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    popupElements.pagePanels.forEach((panel) => {
      panel.hidden = getPopupPage(panel.dataset.pagePanel) !== activePage;
    });
  }

  function handlePageChange(page: PopupPage): void {
    activePage = page;

    if (page !== "keywords") {
      selectedRuleIds.clear();
    }

    if (!elements) {
      return;
    }

    if (currentSettings) {
      renderSettings(elements, currentSettings);
      return;
    }

    renderActivePage(elements);
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
      popupElements.keywordsList.replaceChildren(createEmptyState());
      popupElements.keywordsList.classList.remove("keyword-selection-active");
      return;
    }

    popupElements.keywordsList.replaceChildren(
      ...rules.map((rule, index) => createRuleChip(rule, index, groups))
    );
    popupElements.keywordsList.classList.toggle("keyword-selection-active", isKeywordSelectionActive());
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
    ensureSelectedGroup(groups);
    popupElements.groupsList.replaceChildren(
      ...groups.map((group) => createGroupControl(group, rules))
    );
    renderGroupKeywords(popupElements, groups, rules);
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
    const selected = group.id === selectedGroupId;

    groupControl.className = "group-control";
    groupControl.classList.toggle("group-control-paused", !group.enabled);
    groupControl.classList.toggle("group-control-selected", selected);
    groupControl.tabIndex = 0;
    groupControl.setAttribute("role", "button");
    groupControl.setAttribute("aria-pressed", String(selected));
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
    groupControl.addEventListener("click", (event) => {
      if (event.target instanceof HTMLElement && event.target.closest("button")) {
        return;
      }

      handleSelectGroup(group.id);
    });
    groupControl.addEventListener("keydown", (event) => {
      if (
        (event.key !== "Enter" && event.key !== " ") ||
        event.target instanceof HTMLElement && Boolean(event.target.closest("button"))
      ) {
        return;
      }

      event.preventDefault();
      handleSelectGroup(group.id);
    });

    groupInfo.append(groupName, groupCount);
    groupActions.append(groupToggle);

    if (group.id !== SpoilerShieldShared.DEFAULT_GROUP_ID) {
      groupActions.append(removeButton);
    }

    groupControl.append(groupInfo, groupActions);

    return groupControl;
  }

  function renderGroupKeywords(
    popupElements: PopupElements,
    groups: SpoilerShieldShared.SpoilerGroup[],
    rules: SpoilerShieldShared.SpoilerRule[]
  ): void {
    const group = getSelectedGroup(groups);
    const groupRules = rules.filter((rule) => rule.groupId === group.id);

    popupElements.groupDetailTitle.textContent = group.name;
    popupElements.groupDetailCount.textContent =
      groupRules.length > 0 ? `${groupRules.length} keyword${groupRules.length === 1 ? "" : "s"}` : "none";

    if (groupRules.length === 0) {
      popupElements.groupKeywordsList.replaceChildren(createEmptyState("No keywords in this group"));
      return;
    }

    popupElements.groupKeywordsList.replaceChildren(
      ...groupRules.map((rule, index) => createGroupKeywordChip(rule, index, groups))
    );
  }

  function createGroupKeywordChip(
    rule: SpoilerShieldShared.SpoilerRule,
    index: number,
    groups: SpoilerShieldShared.SpoilerGroup[]
  ): HTMLDivElement {
    const chip = document.createElement("div");
    const chipLeft = document.createElement("div");
    const chipIndex = document.createElement("span");
    const chipText = document.createElement("span");
    const chipStatus = document.createElement("span");
    const chipActions = document.createElement("div");
    const ruleToggle = createRuleToggle(rule);
    const removeButton = document.createElement("button");
    const active = isRuleActive(rule, groups);

    chip.className = "keyword-chip group-keyword-chip";
    chip.classList.toggle("keyword-chip-paused", !active);
    chipLeft.className = "chip-left";
    chipIndex.className = "chip-index";
    chipText.className = "chip-text";
    chipStatus.className = "group-keyword-status";
    chipActions.className = "chip-actions";
    removeButton.className = "chip-remove";
    removeButton.type = "button";

    chipIndex.textContent = String(index + 1).padStart(2, "0");
    chipText.textContent = rule.keyword;
    chipStatus.textContent = active ? "Active" : "Paused";
    removeButton.setAttribute("aria-label", `Remove ${rule.keyword}`);
    removeButton.innerHTML = getCloseIconSvg();
    removeButton.addEventListener("click", () => {
      void handleRemoveKeyword(rule.id);
    });

    chipLeft.append(chipIndex, chipText, chipStatus);
    chipActions.append(ruleToggle, removeButton);
    chip.append(chipLeft, chipActions);

    return chip;
  }

  function createRuleChip(
    rule: SpoilerShieldShared.SpoilerRule,
    index: number,
    groups: SpoilerShieldShared.SpoilerGroup[]
  ): HTMLDivElement {
    const chip = document.createElement("div");
    const chipLeft = document.createElement("div");
    const selectCheckbox = document.createElement("input");
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
    selectCheckbox.className = "chip-select";
    selectCheckbox.type = "checkbox";
    selectCheckbox.checked = selectedRuleIds.has(rule.id);
    chipIndex.className = "chip-index";
    chipText.className = "chip-text";
    chipGroup.className = "chip-group";
    chipActions.className = "chip-actions";
    removeButton.className = "chip-remove";
    removeButton.type = "button";

    chipIndex.textContent = String(index + 1).padStart(2, "0");
    chipText.textContent = rule.keyword;
    chipGroup.textContent = group.name;
    selectCheckbox.setAttribute("aria-label", `Select ${rule.keyword}`);
    selectCheckbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    selectCheckbox.addEventListener("change", () => {
      handleKeywordSelectionChange(rule.id, selectCheckbox.checked);
    });
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
      handleKeywordContextMenu(rule);
    });

    chipLeft.append(selectCheckbox, chipIndex, chipText, chipGroup);
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

  function handleKeywordSelectionChange(ruleId: string, selected: boolean): void {
    if (!elements || !currentSettings) {
      return;
    }

    if (selected) {
      selectedRuleIds.add(ruleId);
    } else {
      selectedRuleIds.delete(ruleId);
    }

    renderSettings(elements, currentSettings);
  }

  function handleSelectAllKeywords(selected: boolean): void {
    if (!elements || !currentSettings) {
      return;
    }

    selectedRuleIds.clear();

    if (selected) {
      currentSettings.rules.forEach((rule) => {
        selectedRuleIds.add(rule.id);
      });
    }

    renderSettings(elements, currentSettings);
  }

  function handleKeywordContextMenu(rule: SpoilerShieldShared.SpoilerRule): void {
    if (!elements || !currentSettings) {
      return;
    }

    if (selectedRuleIds.has(rule.id)) {
      selectedRuleIds.delete(rule.id);
    } else {
      selectedRuleIds.add(rule.id);
    }

    renderSettings(elements, currentSettings);
  }

  function clearKeywordSelection(popupElements: PopupElements): void {
    if (selectedRuleIds.size === 0) {
      return;
    }

    selectedRuleIds.clear();
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

  function renderBulkActions(
    popupElements: PopupElements,
    settings: SpoilerShieldShared.ShieldSettings
  ): void {
    const selectedRules = settings.rules.filter((rule) => selectedRuleIds.has(rule.id));
    const selectedCount = selectedRules.length;
    const currentTargetGroupId = popupElements.bulkGroupSelect.value;
    const availableGroups = settings.groups.filter((group) =>
      !selectedRules.every((rule) => rule.groupId === group.id)
    );
    const options = availableGroups.map((group) => {
      const option = document.createElement("option");

      option.value = group.id;
      option.textContent = group.name;

      return option;
    });

    popupElements.bulkActions.hidden = selectedCount === 0;
    popupElements.bulkCount.textContent = `${selectedCount} selected`;
    popupElements.bulkGroupSelect.replaceChildren(...options);

    if (availableGroups.some((group) => group.id === currentTargetGroupId)) {
      popupElements.bulkGroupSelect.value = currentTargetGroupId;
    }

    popupElements.bulkGroupSelect.disabled = selectedCount === 0 || availableGroups.length === 0;
    popupElements.bulkMoveButton.disabled = selectedCount === 0 || availableGroups.length === 0;
    popupElements.bulkClearButton.disabled = selectedCount === 0;
  }

  function renderSelectAllControl(
    popupElements: PopupElements,
    rules: SpoilerShieldShared.SpoilerRule[]
  ): void {
    const selectedCount = rules.filter((rule) => selectedRuleIds.has(rule.id)).length;
    const allSelected = rules.length > 0 && selectedCount === rules.length;
    const selectionActive = selectedCount > 0;

    popupElements.selectAllControl.hidden = !selectionActive;
    popupElements.bulkSelectAll.checked = allSelected;
    popupElements.bulkSelectAll.indeterminate = selectionActive && !allSelected;
    popupElements.bulkSelectAll.disabled = !selectionActive || rules.length === 0;
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
      if (groupId === selectedGroupId) {
        selectedGroupId = SpoilerShieldShared.DEFAULT_GROUP_ID;
      }
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

  function handleSelectGroup(groupId: string): void {
    if (!elements || !currentSettings || groupId === selectedGroupId) {
      return;
    }

    selectedGroupId = groupId;
    renderSettings(elements, currentSettings);
  }

  function createEmptyState(message = "No keywords yet - add one above"): HTMLDivElement {
    const emptyState = document.createElement("div");
    const emptyText = document.createElement("span");

    emptyState.className = "empty-state";
    emptyState.innerHTML = getShieldOffIconSvg();
    emptyText.textContent = message;
    emptyState.append(emptyText);

    return emptyState;
  }

  function setBusy(popupElements: PopupElements, busy: boolean): void {
    popupElements.statusBar.setAttribute("aria-busy", String(busy));
    popupElements.pageTabs.forEach((tab) => {
      tab.disabled = busy;
    });
    popupElements.addButton.disabled = busy;
    popupElements.groupSelect.disabled = busy;
    popupElements.groupInput.disabled = busy;
    popupElements.addGroupButton.disabled = busy;
    popupElements.toggle.disabled = busy;
    popupElements.deleteGroupCancel.disabled = busy;
    popupElements.deleteGroupConfirm.disabled = busy;
    popupElements.exportBackupButton.disabled = busy;
    popupElements.importBackupButton.disabled = busy;
    popupElements.bulkSelectAll.disabled = busy || !currentSettings || currentSettings.rules.length === 0;
    popupElements.bulkGroupSelect.disabled = busy || selectedRuleIds.size === 0 || !hasBulkMoveTarget();
    popupElements.bulkMoveButton.disabled = busy || selectedRuleIds.size === 0 || !hasBulkMoveTarget();
    popupElements.bulkClearButton.disabled = busy || selectedRuleIds.size === 0;
    popupElements.groupsList
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((button) => {
        button.disabled = busy;
      });
    popupElements.keywordsList
      .querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input")
      .forEach((control) => {
        control.disabled = busy;
      });
    popupElements.groupKeywordsList
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

  function hasBulkMoveTarget(): boolean {
    if (!currentSettings) {
      return false;
    }

    const selectedRules = currentSettings.rules.filter((rule) => selectedRuleIds.has(rule.id));

    if (selectedRules.length === 0) {
      return false;
    }

    return currentSettings.groups.some((group) =>
      !selectedRules.every((rule) => rule.groupId === group.id)
    );
  }

  function isKeywordSelectionActive(): boolean {
    return selectedRuleIds.size > 0;
  }

  function getPopupPage(value: string | undefined): PopupPage | undefined {
    if (value === "keywords" || value === "groups" || value === "settings") {
      return value;
    }

    return undefined;
  }

  function ensureSelectedGroup(groups: SpoilerShieldShared.SpoilerGroup[]): void {
    if (groups.some((group) => group.id === selectedGroupId)) {
      return;
    }

    selectedGroupId = groups[0]?.id ?? SpoilerShieldShared.DEFAULT_GROUP_ID;
  }

  function getSelectedGroup(
    groups: SpoilerShieldShared.SpoilerGroup[]
  ): SpoilerShieldShared.SpoilerGroup {
    return groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? {
      id: SpoilerShieldShared.DEFAULT_GROUP_ID,
      name: "General",
      enabled: true,
      createdAt: 0
    };
  }

  function findGroupByName(
    groups: SpoilerShieldShared.SpoilerGroup[],
    name: string
  ): SpoilerShieldShared.SpoilerGroup | undefined {
    const normalizedName = name.trim().toLowerCase();

    return groups.find((group) => group.name.toLowerCase() === normalizedName);
  }

  function getBackupDateStamp(): string {
    return new Date().toISOString().slice(0, 10);
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

  function getImportErrorMessage(error: unknown): string {
    if (error instanceof SyntaxError) {
      return "Backup file is not valid JSON.";
    }

    return getErrorMessage(error);
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
