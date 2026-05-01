export class User {
  constructor({ userId, name, email }) {
    this.userId = userId;
    this.name = name;
    this.email = email;
  }

  createBuild(defaultLayout) {
    return new Build({
      buildId: `build-${Date.now()}`,
      layout: defaultLayout,
      desiredSoundProfile: "balanced",
      desiredTypingFeel: "firm",
      status: "draft",
      selectedParts: {},
      compatibilityResults: [],
    });
  }

  viewBuilds(builds) {
    return builds;
  }
}

export class Layout {
  constructor({ id, name, size, description }) {
    this.id = id;
    this.name = name;
    this.size = size;
    this.description = description;
  }

  matchesPart(part) {
    return part.layoutSupport.includes(this.id);
  }
}

export class Part {
  constructor(data) {
    Object.assign(this, data);
    this.groupBuy = false;
  }

  getSpecifications() {
    return this.specs ?? [];
  }

  supportsLayout(layoutId) {
    return this.layoutSupport.includes(layoutId);
  }
}

export class GroupBuyPart extends Part {
  constructor(data) {
    super(data);
    this.groupBuy = true;
  }

  hasCompleteSpecs() {
    return Boolean(this.specsComplete);
  }
}

export class CompatibilityResult {
  constructor({
    partId,
    status,
    confidenceLevel,
    explanation,
    sourceReferences = [],
    alternatives = [],
  }) {
    this.partId = partId;
    this.status = status;
    this.confidenceLevel = confidenceLevel;
    this.explanation = explanation;
    this.sourceReferences = sourceReferences;
    this.alternatives = alternatives;
  }

  isCompatible() {
    return this.status === "compatible";
  }

  canIncludeWithWarning() {
    return this.status === "conditional" || this.status === "uncertain";
  }
}

export class SourceReference {
  constructor({ id, sourceType, title, trustLevel, description }) {
    this.id = id;
    this.sourceType = sourceType;
    this.title = title;
    this.trustLevel = trustLevel;
    this.description = description;
  }

  displaySource() {
    return `${this.sourceType}: ${this.title}`;
  }
}

export class Build {
  constructor({
    buildId,
    layout,
    desiredSoundProfile,
    desiredTypingFeel,
    status,
    selectedParts = {},
    compatibilityResults = [],
  }) {
    this.buildId = buildId;
    this.layout = layout;
    this.desiredSoundProfile = desiredSoundProfile;
    this.desiredTypingFeel = desiredTypingFeel;
    this.status = status;
    this.selectedParts = selectedParts;
    this.compatibilityResults = compatibilityResults;
  }

  addPart(part, compatibilityResult) {
    return new Build({
      ...this,
      status: "draft",
      selectedParts: {
        ...this.selectedParts,
        [part.category]: part,
      },
      compatibilityResults: [compatibilityResult, ...this.compatibilityResults].slice(0, 8),
    });
  }

  removePart(category) {
    const nextParts = { ...this.selectedParts };
    delete nextParts[category];

    return new Build({
      ...this,
      status: "draft",
      selectedParts: nextParts,
    });
  }

  updateLayout(layout) {
    return new Build({
      ...this,
      layout,
      status: "draft",
    });
  }

  updatePreferences({ desiredSoundProfile, desiredTypingFeel }) {
    return new Build({
      ...this,
      desiredSoundProfile,
      desiredTypingFeel,
      status: "draft",
    });
  }

  save() {
    return new Build({
      ...this,
      status: "saved",
    });
  }
}
