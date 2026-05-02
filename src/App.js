import { BuildController } from "./controllers/buildController.js";
import { CompatibilityController } from "./controllers/compatibilityController.js";
import { SearchController } from "./controllers/searchController.js";
import { categoryLabels, preferenceOptions } from "./data/mockData.js";
import { Build, User } from "./models/domain.js";
import { CompatibilityEngine } from "./services/compatibilityEngine.js";
import { PartCatalog } from "./services/partCatalog.js";
import {
  analyzePreferenceMatch,
  getBuildTraitProfile,
  getPartTraitPreview,
} from "./services/preferenceScoring.js";
import { SourceReferenceRepository } from "./services/sourceReferenceRepository.js";

const {
  AlertTriangle,
  Box,
  CheckCircle2,
  Info,
  PackagePlus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} = window.LucideReact;
const { useMemo, useState } = window.React;
const h = window.React.createElement;
const sourceRepository = new SourceReferenceRepository();
const partCatalog = new PartCatalog();
const compatibilityEngine = new CompatibilityEngine(sourceRepository);
const compatibilityController = new CompatibilityController(compatibilityEngine, partCatalog);
const buildController = new BuildController(compatibilityController);
const searchController = new SearchController(partCatalog);
const demoUser = new User({
  userId: 1,
  name: "Keyboard Builder",
  email: "builder@example.com",
});

const defaultFilters = {
  query: "",
  category: "all",
  brand: "all",
  layoutMode: "current",
};
const savedBuildsKey = "keyboardCompatibilitySystem.savedBuilds.v2";
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function icon(IconComponent, size = 16) {
  return h(IconComponent, { size, "aria-hidden": "true" });
}

function formatCurrency(value = 0) {
  return currencyFormatter.format(value);
}

function getBuildTotal(parts) {
  return parts.reduce((total, part) => total + (part.price ?? 0), 0);
}

function loadSavedBuilds() {
  try {
    return JSON.parse(window.localStorage.getItem(savedBuildsKey)) ?? [];
  } catch {
    return [];
  }
}

function persistSavedBuilds(savedBuilds) {
  window.localStorage.setItem(savedBuildsKey, JSON.stringify(savedBuilds));
}

function makeSavedBuildRecord(build, name) {
  return {
    id: `saved-${Date.now()}`,
    name,
    savedAt: new Date().toISOString(),
    layoutId: build.layout?.id,
    desiredSoundProfile: build.desiredSoundProfile,
    desiredTypingFeel: build.desiredTypingFeel,
    selectedPartIds: Object.fromEntries(
      Object.entries(build.selectedParts).map(([category, part]) => [category, part.id]),
    ),
  };
}

function restoreSavedBuild(record) {
  const layout = partCatalog.getLayoutById(record.layoutId) ?? partCatalog.getLayoutById("65");
  const selectedParts = Object.entries(record.selectedPartIds ?? {}).reduce(
    (partsByCategory, [category, partId]) => {
      const part = partCatalog.getPartById(partId);

      if (part) {
        partsByCategory[category] = part;
      }

      return partsByCategory;
    },
    {},
  );

  return new Build({
    buildId: record.id,
    layout,
    desiredSoundProfile: record.desiredSoundProfile ?? "balanced",
    desiredTypingFeel: record.desiredTypingFeel ?? "firm",
    status: "saved",
    selectedParts,
    compatibilityResults: [],
  });
}

function getActiveFilterLabels(filters, build) {
  const labels = [];

  if (filters.layoutMode === "current" && build.layout) {
    labels.push(`${build.layout.name} layout`);
  }

  if (filters.category !== "all") {
    labels.push(`${categoryLabels[filters.category]} category`);
  }

  if (filters.brand !== "all") {
    labels.push(`${filters.brand} brand`);
  }

  if (filters.query.trim()) {
    labels.push(`search term "${filters.query.trim()}"`);
  }

  return labels.length ? labels.join(" + ") : "none";
}

function getPartGuidance(part, build) {
  const buildPreferences = {
    desiredSoundProfile: build.desiredSoundProfile,
    desiredTypingFeel: build.desiredTypingFeel,
  };
  const supportsCurrentLayout = build.layout ? part.supportsLayout(build.layout.id) : false;
  const hardwareConflict = compatibilityEngine.findHardwareConflict(build, part);
  const incompleteGroupBuy = part.groupBuy && !part.hasCompleteSpecs();
  const prospectiveParts = {
    ...build.selectedParts,
    [part.category]: part,
  };
  const preferenceAnalysis = analyzePreferenceMatch(
    Object.values(prospectiveParts),
    buildPreferences,
  );
  const labels = [];
  const clues = [];

  if (supportsCurrentLayout && !hardwareConflict) {
    labels.push("Matches current layout");
  }

  if (preferenceAnalysis.level === "High") {
    labels.push("Preference Match: High");
  }

  if (
    supportsCurrentLayout &&
    !hardwareConflict &&
    !incompleteGroupBuy &&
    preferenceAnalysis.level === "High"
  ) {
    labels.unshift("Recommended");
  }

  if (incompleteGroupBuy) {
    clues.push("Uncertain: incomplete specs");
  } else if (!supportsCurrentLayout || hardwareConflict) {
    clues.push("May be incompatible");
  } else {
    clues.push("Compatible with current build");
  }

  if (preferenceAnalysis.level === "High") {
    clues.push("Good match for selected preferences");
  }

  return {
    labels: labels.slice(0, 3),
    clues,
    preferenceLevel: preferenceAnalysis.level,
  };
}

function App() {
  const [build, setBuild] = useState(() =>
    buildController.startNewBuild(demoUser, partCatalog.getLayoutById("65")),
  );
  const [filters, setFilters] = useState(defaultFilters);
  const [compatibilityResult, setCompatibilityResult] = useState(null);
  const [pendingPart, setPendingPart] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedBuilds, setSavedBuilds] = useState(loadSavedBuilds);

  const activeLayoutId = filters.layoutMode === "current" ? build.layout?.id : "all";
  const results = useMemo(
    () =>
      searchController.searchParts({
        ...filters,
        layoutId: activeLayoutId,
      }),
    [activeLayoutId, filters],
  );
  const brands = useMemo(() => partCatalog.getBrands(), []);
  const selectedParts = Object.values(build.selectedParts);
  const preferenceAnalysis = analyzePreferenceMatch(selectedParts, {
    desiredSoundProfile: build.desiredSoundProfile,
    desiredTypingFeel: build.desiredTypingFeel,
  });
  const traitProfile = getBuildTraitProfile(selectedParts);
  const currentResultPart = compatibilityResult
    ? partCatalog.getPartById(compatibilityResult.partId)
    : null;

  function updateFilter(name, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  function handleLayoutChange(layoutId) {
    const layout = partCatalog.getLayoutById(layoutId);
    setBuild((currentBuild) => buildController.selectLayout(currentBuild, layout));
    setCompatibilityResult(null);
    setPendingPart(null);
    setSaveMessage("");
  }

  function handlePreferenceChange(name, value) {
    setBuild((currentBuild) =>
      buildController.updatePreferences(currentBuild, {
        desiredSoundProfile:
          name === "desiredSoundProfile" ? value : currentBuild.desiredSoundProfile,
        desiredTypingFeel: name === "desiredTypingFeel" ? value : currentBuild.desiredTypingFeel,
      }),
    );
    setSaveMessage("");
  }

  function attemptAddPart(part) {
    const existingPart = build.selectedParts[part.category];

    if (existingPart && existingPart.id !== part.id) {
      const categoryLabel = categoryLabels[part.category].toLowerCase();
      const shouldReplace = window.confirm(
        `This will replace your current ${categoryLabel}, ${existingPart.name}. Continue?`,
      );

      if (!shouldReplace) {
        setSaveMessage("Replacement canceled.");
        return;
      }
    }

    const outcome = buildController.addPartToBuild(build, part);

    setCompatibilityResult(outcome.compatibilityResult);
    setPendingPart(outcome.requiresConfirmation ? part : null);
    setBuild(outcome.build);
    setSaveMessage(
      existingPart && existingPart.id !== part.id && outcome.compatibilityResult.isCompatible()
        ? `Replaced ${existingPart.name} with ${part.name}.`
        : "",
    );
  }

  function includePendingPart() {
    if (!pendingPart || !compatibilityResult) {
      return;
    }

    setBuild((currentBuild) =>
      buildController.includePartWithWarning(currentBuild, pendingPart, compatibilityResult),
    );
    setPendingPart(null);
    setSaveMessage("");
  }

  function removePart(category) {
    setBuild((currentBuild) => buildController.removePart(currentBuild, category));
    setSaveMessage("");
  }

  function saveBuild() {
    const defaultName = `${build.layout?.name ?? "Keyboard"} build`;
    const name = window.prompt("Name this build", defaultName);

    if (!name?.trim()) {
      setSaveMessage("Save canceled. Add a name to save this build.");
      return;
    }

    const savedRecord = makeSavedBuildRecord(build, name.trim());
    const nextSavedBuilds = [savedRecord, ...savedBuilds].slice(0, 6);

    persistSavedBuilds(nextSavedBuilds);
    setSavedBuilds(nextSavedBuilds);
    setBuild((currentBuild) => buildController.saveBuild(currentBuild));
    setSaveMessage(`Saved "${name.trim()}".`);
  }

  function openSavedBuild(savedBuild) {
    setBuild(restoreSavedBuild(savedBuild));
    setCompatibilityResult(null);
    setPendingPart(null);
    setFilters(defaultFilters);
    setSaveMessage(`Opened "${savedBuild.name}".`);
  }

  function removeIncompatiblePart(part) {
    const selectedPart = build.selectedParts[part.category];

    if (selectedPart?.id === part.id) {
      setBuild((currentBuild) => buildController.removePart(currentBuild, part.category));
      setSaveMessage(`Removed ${part.name} from the build.`);
    } else {
      setSaveMessage(`${part.name} was not added to the build.`);
    }

    setCompatibilityResult(null);
    setPendingPart(null);
  }

  function viewSuggestedParts(category) {
    setFilters({
      ...defaultFilters,
      category,
      layoutMode: "current",
    });
    setSaveMessage(
      `Showing compatible ${categoryLabels[category]} suggestions for ${build.layout?.name}.`,
    );
  }

  function resetBuild(layoutId = "65") {
    const layout = partCatalog.getLayoutById(layoutId);
    setBuild(buildController.startNewBuild(demoUser, layout));
    setCompatibilityResult(null);
    setPendingPart(null);
    setSaveMessage("");
  }

  function applyDemoScenario(scenario) {
    if (scenario === "compatible") {
      resetBuild("65");
      setFilters({ query: "kbd67", category: "case", brand: "all", layoutMode: "current" });
      return;
    }

    if (scenario === "no-results") {
      resetBuild("65");
      setFilters({
        query: "banana wireless brass gasket",
        category: "all",
        brand: "all",
        layoutMode: "current",
      });
      return;
    }

    if (scenario === "incompatible") {
      const layout = partCatalog.getLayoutById("65");
      const casePart = partCatalog.getPartById("case-kbd67-lite");
      const badPart = partCatalog.getPartById("pcb-dz60-v2");
      const startingBuild = buildController.startNewBuild(demoUser, layout);
      const caseOutcome = buildController.addPartToBuild(startingBuild, casePart);
      const badOutcome = buildController.addPartToBuild(caseOutcome.build, badPart);

      setBuild(caseOutcome.build);
      setCompatibilityResult(badOutcome.compatibilityResult);
      setPendingPart(null);
      setFilters({ query: "dz60", category: "pcb", brand: "all", layoutMode: "all" });
      setSaveMessage("");
      return;
    }

    if (scenario === "group-buy") {
      const layout = partCatalog.getLayoutById("65");
      const groupBuyPart = partCatalog.getPartById("pcb-aurora65-gb");
      const startingBuild = buildController.startNewBuild(demoUser, layout);
      const outcome = buildController.addPartToBuild(startingBuild, groupBuyPart);

      setBuild(outcome.build);
      setCompatibilityResult(outcome.compatibilityResult);
      setPendingPart(groupBuyPart);
      setFilters({ query: "aurora65", category: "pcb", brand: "all", layoutMode: "current" });
      setSaveMessage("");
    }
  }

  return h(
    "main",
    { className: "app-shell" },
    h(AppHeader, { onReset: () => resetBuild(), onSave: saveBuild }),
    h(DemoStrip, { onScenario: applyDemoScenario }),
    h(
      "div",
      { className: "workspace-grid" },
      h(
        "div",
        { className: "main-column" },
        h(BuildSetup, {
          build,
          onLayoutChange: handleLayoutChange,
          onPreferenceChange: handlePreferenceChange,
        }),
        h(PartSearch, {
          build,
          filters,
          brands,
          results,
          onFilter: updateFilter,
          onClearFilters: clearFilters,
          onAdd: attemptAddPart,
        }),
      ),
      h(
        "aside",
        { className: "side-column" },
        h(BuildSummary, {
          build,
          selectedParts,
          preferenceAnalysis,
          traitProfile,
          savedBuilds,
          saveMessage,
          onRemove: removePart,
          onOpenSavedBuild: openSavedBuild,
        }),
        h(CompatibilityPanel, {
          result: compatibilityResult,
          part: currentResultPart,
          pendingPart,
          onInclude: includePendingPart,
          onRemoveIncompatible: removeIncompatiblePart,
          onTryAlternative: attemptAddPart,
          onViewSuggestedParts: viewSuggestedParts,
        }),
      ),
    ),
  );
}

function AppHeader({ onReset, onSave }) {
  return h(
    "header",
    { className: "app-header" },
    h(
      "div",
      null,
      h("p", { className: "eyebrow" }, "Software Requirements Engineering MVP"),
      h("h1", null, "Keyboard Compatibility System"),
    ),
    h(
      "div",
      { className: "header-actions" },
      h(
        "button",
        { className: "secondary-button", type: "button", onClick: onReset },
        icon(RotateCcw),
        "Reset",
      ),
      h(
        "button",
        { className: "primary-button", type: "button", onClick: onSave },
        icon(Save),
        "Save Build",
      ),
    ),
  );
}

function DemoStrip({ onScenario }) {
  const scenarios = [
    ["compatible", CheckCircle2, "Compatible demo"],
    ["no-results", Search, "No results demo"],
    ["incompatible", XCircle, "Incompatible demo"],
    ["group-buy", AlertTriangle, "Group-buy demo"],
  ];

  return h(
    "section",
    { className: "demo-strip", "aria-label": "Demo scenarios" },
    scenarios.map(([id, IconComponent, label]) =>
      h(
        "button",
        { key: id, type: "button", onClick: () => onScenario(id) },
        icon(IconComponent),
        label,
      ),
    ),
  );
}

function BuildSetup({ build, onLayoutChange, onPreferenceChange }) {
  return h(
    "section",
    { className: "panel" },
    h(SectionTitle, { iconComponent: SlidersHorizontal, title: "Build Setup" }),
    h(
      "div",
      { className: "setup-grid" },
      h(
        "label",
        null,
        "Layout",
        h(
          "select",
          {
            value: build.layout?.id ?? "",
            onChange: (event) => onLayoutChange(event.target.value),
          },
          partCatalog.layouts.map((layout) =>
            h("option", { key: layout.id, value: layout.id }, `${layout.name} - ${layout.size}`),
          ),
        ),
      ),
      h(
        "label",
        null,
        "Sound profile",
        h(
          "select",
          {
            value: build.desiredSoundProfile,
            onChange: (event) =>
              onPreferenceChange("desiredSoundProfile", event.target.value),
          },
          preferenceOptions.soundProfiles.map((profile) =>
            h("option", { key: profile, value: profile }, profile),
          ),
        ),
      ),
      h(
        "label",
        null,
        "Typing feel",
        h(
          "select",
          {
            value: build.desiredTypingFeel,
            onChange: (event) => onPreferenceChange("desiredTypingFeel", event.target.value),
          },
          preferenceOptions.typingFeels.map((feel) =>
            h("option", { key: feel, value: feel }, feel),
          ),
        ),
      ),
    ),
  );
}

function PartSearch({ build, filters, brands, results, onFilter, onClearFilters, onAdd }) {
  const activeFilterText = getActiveFilterLabels(filters, build);

  return h(
    "section",
    { className: "panel" },
    h(SectionTitle, { iconComponent: Search, title: "Part Search" }),
    h(
      "div",
      { className: "filter-grid" },
      h(
        "label",
        { className: "search-field" },
        "Search",
        h("input", {
          type: "search",
          value: filters.query,
          placeholder: "name, brand, mount, version, specs",
          onChange: (event) => onFilter("query", event.target.value),
        }),
        h(
          "span",
          { className: "field-help" },
          "Search also checks specs and tags such as material, mount, and kit coverage.",
        ),
      ),
      h(
        "label",
        null,
        "Category",
        h(
          "select",
          {
            value: filters.category,
            onChange: (event) => onFilter("category", event.target.value),
          },
          h("option", { value: "all" }, "All categories"),
          Object.entries(categoryLabels).map(([id, label]) =>
            h("option", { key: id, value: id }, label),
          ),
        ),
      ),
      h(
        "label",
        null,
        "Brand",
        h(
          "select",
          { value: filters.brand, onChange: (event) => onFilter("brand", event.target.value) },
          h("option", { value: "all" }, "All brands"),
          brands.map((brand) => h("option", { key: brand, value: brand }, brand)),
        ),
      ),
      h(
        "label",
        null,
        "Layout filter",
        h(
          "select",
          {
            value: filters.layoutMode,
            onChange: (event) => onFilter("layoutMode", event.target.value),
          },
          h("option", { value: "current" }, "Current layout"),
          h("option", { value: "all" }, "All layouts"),
        ),
      ),
      h(
        "div",
        { className: "filter-actions" },
        h(
          "button",
          { className: "secondary-button", type: "button", onClick: onClearFilters },
          icon(RotateCcw),
          "Clear Filters",
        ),
      ),
    ),
    h(
      "div",
      { className: "results-summary" },
      h("span", null, `${results.length} result${results.length === 1 ? "" : "s"}`),
      h("span", null, `Current layout: ${build.layout?.name}`),
    ),
    results.length === 0
      ? h(
          "div",
          { className: "empty-state", role: "status" },
          icon(Info, 20),
          h(
            "div",
            null,
            h("strong", null, "No matching parts found."),
            h("p", null, `Current filters: ${activeFilterText}.`),
            h("p", null, "Broaden the search, switch to all layouts, or clear the filters."),
            h(
              "button",
              { className: "secondary-button empty-action", type: "button", onClick: onClearFilters },
              icon(RotateCcw),
              "Clear Filters",
            ),
          ),
        )
      : h(
          "div",
          { className: "result-list" },
          results.map((part) =>
            h(PartRow, {
              key: part.id,
              part,
              isSelected: Boolean(build.selectedParts[part.category]?.id === part.id),
              isReplacement: Boolean(
                build.selectedParts[part.category] &&
                  build.selectedParts[part.category]?.id !== part.id,
              ),
              guidance: getPartGuidance(part, build),
              traitPreview: getPartTraitPreview(part),
              onAdd: () => onAdd(part),
            }),
          ),
        ),
  );
}

function PartRow({ part, isSelected, isReplacement, guidance, traitPreview, onAdd }) {
  return h(
    "article",
    { className: `result-row ${part.groupBuy ? "group-buy-row" : ""}` },
    h(
      "div",
      { className: "result-main" },
      h(
        "div",
        { className: "result-heading" },
        h(
          "div",
          null,
          h("h3", null, part.name),
          h("strong", { className: "part-price" }, formatCurrency(part.price)),
        ),
        h(
          "div",
          { className: "heading-badges" },
          h(StatusBadge, { status: part.groupBuy ? "group-buy" : part.status }),
          guidance.labels.map((label) =>
            h("span", { key: label, className: "recommendation-label" }, label),
          ),
        ),
      ),
      h(
        "p",
        null,
        `${part.brand} - ${categoryLabels[part.category]} - ${part.layoutSupport.join(", ")} layout`,
      ),
      h(
        "div",
        { className: "part-meta" },
        h("span", null, part.version),
        h("span", null, part.mountType),
        h("span", null, part.compatibilityFamily),
      ),
      h(
        "div",
        { className: "selection-clues" },
        guidance.clues.map((clue) => h("span", { key: clue }, clue)),
      ),
      h(
        "div",
        { className: "trait-preview", "aria-label": `${part.name} sound and feel contribution` },
        h(
          "span",
          null,
          h("strong", null, "Highest trait:"),
          ` ${traitPreview.highestTraitLabel}`,
        ),
        h(
          "span",
          null,
          h("strong", null, "Contributes:"),
          ` ${traitPreview.contributionLabel}`,
        ),
      ),
      h(
        "div",
        { className: "spec-list" },
        part.getSpecifications().map((spec) => h("span", { key: spec }, spec)),
      ),
    ),
    h(
      "button",
      { className: "primary-button compact", type: "button", onClick: onAdd, disabled: isSelected },
      icon(PackagePlus),
      isSelected ? "Added" : isReplacement ? "Replace" : "Add",
    ),
  );
}

function BuildSummary({
  build,
  selectedParts,
  preferenceAnalysis,
  traitProfile,
  savedBuilds,
  saveMessage,
  onRemove,
  onOpenSavedBuild,
}) {
  const estimatedTotal = getBuildTotal(selectedParts);

  return h(
    "section",
    { className: "panel side-panel" },
    h(SectionTitle, { iconComponent: Box, title: "Build Summary" }),
    h(
      "div",
      { className: "build-facts" },
      h("span", null, "Layout"),
      h("strong", null, build.layout?.name),
      h("span", null, "Sound"),
      h("strong", null, build.desiredSoundProfile),
      h("span", null, "Feel"),
      h("strong", null, build.desiredTypingFeel),
      h("span", null, "Status"),
      h("strong", null, build.status),
      h("span", null, "Estimated total"),
      h("strong", null, `${formatCurrency(estimatedTotal)} before tax`),
    ),
    h(
      "div",
      { className: "preference-summary" },
      h("strong", null, `Preference Match: ${preferenceAnalysis.level}`),
      h("p", null, preferenceAnalysis.explanation.replace(/^Preference Match: [^.]+\. /, "")),
    ),
    h(
      "div",
      { className: "trait-dashboard" },
      h(
        "div",
        { className: "direction-summary" },
        h("span", null, "Build Sound & Feel Direction"),
        h("strong", null, traitProfile.directionLabel),
      ),
      h(
        "div",
        { className: "trait-bars" },
        traitProfile.bars.map((bar) => h(TraitBar, { key: bar.trait, bar })),
      ),
      h(
        "div",
        { className: "contributors-summary" },
        h("span", null, "Top contributors"),
        h("strong", null, traitProfile.topContributorLabel),
      ),
    ),
    h(
      "div",
      { className: "selected-list" },
      Object.entries(categoryLabels).map(([category, label]) => {
        const part = build.selectedParts[category];
        return h(
          "div",
          { className: "selected-row", key: category },
          h(
            "div",
            null,
            h("span", null, label),
            h("strong", null, part ? part.name : "Not selected"),
            part ? h("span", null, formatCurrency(part.price)) : null,
          ),
          part
            ? h(
                "button",
                { type: "button", className: "ghost-button", onClick: () => onRemove(category) },
                "Remove",
              )
            : null,
        );
      }),
    ),
    selectedParts.length === 0
      ? h("p", { className: "muted" }, "No parts added yet.")
      : h(
          "p",
          { className: "muted" },
          `${selectedParts.length} selected part${selectedParts.length === 1 ? "" : "s"}.`,
        ),
    h(
      "div",
      { className: "saved-builds" },
      h("h4", null, "Saved builds"),
      savedBuilds.length === 0
        ? h("p", { className: "muted" }, "No saved builds yet.")
        : savedBuilds.map((savedBuild) =>
            h(
              "button",
              {
                key: savedBuild.id,
                type: "button",
                className: "saved-build-button",
                onClick: () => onOpenSavedBuild(savedBuild),
              },
              h("span", null, savedBuild.name),
              h(
                "small",
                null,
                `${Object.keys(savedBuild.selectedPartIds ?? {}).length} part${
                  Object.keys(savedBuild.selectedPartIds ?? {}).length === 1 ? "" : "s"
                }`,
              ),
            ),
          ),
    ),
    saveMessage ? h("p", { className: "save-message" }, saveMessage) : null,
  );
}

function TraitBar({ bar }) {
  const contributorText =
    bar.contributorCount === 1 ? "1 part" : `${bar.contributorCount} parts`;

  return h(
    "div",
    { className: "trait-bar-row" },
    h(
      "div",
      { className: "trait-bar-label" },
      h("span", null, bar.label),
      h("small", null, bar.contributorCount > 0 ? contributorText : "0 parts"),
    ),
    h(
      "div",
      {
        className: "trait-track",
        role: "meter",
        "aria-label": `${bar.label} contribution`,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.round(bar.percent),
      },
      h("span", { style: { width: `${bar.percent}%` } }),
    ),
  );
}

function CompatibilityPanel({
  result,
  part,
  pendingPart,
  onInclude,
  onRemoveIncompatible,
  onTryAlternative,
  onViewSuggestedParts,
}) {
  if (!result || !part) {
    return h(
      "section",
      { className: "panel side-panel" },
      h(SectionTitle, { iconComponent: ShieldCheck, title: "Compatibility Result" }),
      h(
        "div",
        { className: "empty-state compact-empty", role: "status" },
        icon(Info, 18),
        h("p", null, "Select a part to run the compatibility check."),
      ),
    );
  }

  return h(
    "section",
    { className: `panel side-panel result-panel ${result.status}` },
    h(SectionTitle, {
      iconComponent: result.status === "compatible" ? CheckCircle2 : AlertTriangle,
      title: "Compatibility Result",
    }),
    h(
      "div",
      { className: "result-status-line" },
      h(StatusBadge, { status: result.status }),
      h("span", null, `Confidence: ${result.confidenceLevel}`),
    ),
    h("h3", null, part.name),
    h("p", null, result.explanation),
    result.status === "incompatible"
      ? h(
          "div",
          { className: "recovery-box" },
          h("h4", null, "Recovery actions"),
          result.alternatives[0]
            ? h(
                "p",
                null,
                `Suggested alternative: ${result.alternatives[0].name}, which matches the ${result.alternatives[0].layoutSupport.join(", ")} layout.`,
              )
            : h(
                "p",
                null,
                "No compatible alternative is available in the mock catalog for this exact slot.",
              ),
          h(
            "div",
            { className: "warning-actions" },
            h(
              "button",
              {
                className: "secondary-button",
                type: "button",
                onClick: () => onRemoveIncompatible(part),
              },
              "Remove incompatible part",
            ),
            result.alternatives[0]
              ? h(
                  "button",
                  {
                    className: "primary-button",
                    type: "button",
                    onClick: () => onTryAlternative(result.alternatives[0]),
                  },
                  "Replace with compatible alternative",
                )
              : null,
            h(
              "button",
              {
                className: "secondary-button",
                type: "button",
                onClick: () => onViewSuggestedParts(part.category),
              },
              "View suggested compatible parts",
            ),
          ),
        )
      : null,
    pendingPart
      ? h(
          "div",
          { className: "warning-actions" },
          h(
            "button",
            { className: "primary-button", type: "button", onClick: onInclude },
            icon(AlertTriangle),
            "Include with warning",
          ),
        )
      : null,
    result.alternatives.length > 0
      ? h(
          "div",
          { className: "alternatives" },
          h("h4", null, "Suggested alternatives"),
          result.alternatives.map((alternative) =>
            h(
              "button",
              { key: alternative.id, type: "button", onClick: () => onTryAlternative(alternative) },
              alternative.name,
            ),
          ),
        )
      : null,
    h(
      "div",
      { className: "sources" },
      h("h4", null, "Trusted compatibility information"),
      result.sourceReferences.length === 0
        ? h("p", { className: "muted" }, "No source references attached.")
        : result.sourceReferences.map((source) =>
            h(
              "article",
              { key: source.id, className: "source-row" },
              h(
                "div",
                null,
                h("strong", null, source.title),
                h("span", null, `${source.sourceType} - Trust: ${source.trustLevel}`),
              ),
              h("p", null, source.description),
            ),
          ),
    ),
  );
}

function SectionTitle({ iconComponent, title }) {
  return h("div", { className: "section-title" }, icon(iconComponent, 18), h("h2", null, title));
}

function StatusBadge({ status }) {
  const label =
    {
      available: "available",
      compatible: "compatible",
      incompatible: "incompatible",
      conditional: "conditional",
      uncertain: "uncertain",
      "group-buy": "group-buy",
    }[status] ?? status;

  return h("span", { className: `status-badge ${status}` }, label);
}

export default App;
