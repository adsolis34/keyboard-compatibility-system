export class CompatibilityController {
  constructor(compatibilityEngine, partCatalog) {
    this.compatibilityEngine = compatibilityEngine;
    this.partCatalog = partCatalog;
  }

  verifyPartCompatibility(build, part) {
    const result = this.compatibilityEngine.evaluate(build, part);

    if (result.status === "incompatible") {
      return this.handleIncompatiblePart(build, part, result);
    }

    return result;
  }

  handleIncompatiblePart(build, part, result) {
    const existingHardware = Object.values(build.selectedParts).find(
      (selectedPart) =>
        selectedPart.category !== part.category &&
        ["case", "pcb", "plate"].includes(selectedPart.category),
    );

    const alternatives = this.partCatalog.findAlternatives({
      category: part.category,
      layoutId: build.layout?.id,
      excludingPartId: part.id,
      compatibilityFamily: existingHardware?.compatibilityFamily,
    });

    result.alternatives = alternatives;
    return result;
  }
}
