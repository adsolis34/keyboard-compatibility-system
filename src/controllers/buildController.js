export class BuildController {
  constructor(compatibilityController) {
    this.compatibilityController = compatibilityController;
  }

  startNewBuild(user, defaultLayout) {
    return user.createBuild(defaultLayout);
  }

  selectLayout(build, layout) {
    return build.updateLayout(layout);
  }

  updatePreferences(build, preferences) {
    return build.updatePreferences(preferences);
  }

  addPartToBuild(build, part) {
    const compatibilityResult = this.compatibilityController.verifyPartCompatibility(build, part);

    if (compatibilityResult.isCompatible()) {
      return {
        build: build.addPart(part, compatibilityResult),
        compatibilityResult,
        requiresConfirmation: false,
      };
    }

    return {
      build,
      compatibilityResult,
      requiresConfirmation: compatibilityResult.canIncludeWithWarning(),
    };
  }

  includePartWithWarning(build, part, compatibilityResult) {
    return build.addPart(part, compatibilityResult);
  }

  removePart(build, category) {
    return build.removePart(category);
  }

  saveBuild(build) {
    return build.save();
  }
}
