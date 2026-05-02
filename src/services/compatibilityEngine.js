import { CompatibilityResult } from "../models/domain.js";

const hardwareCategories = new Set(["case", "pcb", "plate"]);

export class CompatibilityEngine {
  constructor(sourceReferenceRepository) {
    this.sourceReferenceRepository = sourceReferenceRepository;
  }

  evaluate(build, part) {
    const sourceReferences = this.sourceReferenceRepository.getSources(part);

    if (!build.layout) {
      return new CompatibilityResult({
        partId: part.id,
        status: "conditional",
        confidenceLevel: "Medium",
        explanation:
          "Select a keyboard layout before finalizing this part. The system can only do a partial check right now.",
        sourceReferences,
      });
    }

    if (!part.supportsLayout(build.layout.id)) {
      return new CompatibilityResult({
        partId: part.id,
        status: "incompatible",
        confidenceLevel: "High",
        explanation: `${part.name} supports ${part.layoutSupport.join(", ")} layouts, but the current build is ${build.layout.name}.`,
        sourceReferences,
      });
    }

    const hardwareConflict = this.findHardwareConflict(build, part);
    if (hardwareConflict) {
      return new CompatibilityResult({
        partId: part.id,
        status: "incompatible",
        confidenceLevel: "High",
        explanation: `${part.name} uses the ${part.mountType} mount family, but ${hardwareConflict.name} in the build uses the ${hardwareConflict.mountType} family.`,
        sourceReferences,
      });
    }

    if (part.groupBuy && !part.hasCompleteSpecs()) {
      return new CompatibilityResult({
        partId: part.id,
        status: "uncertain",
        confidenceLevel: "Low",
        explanation: `${part.name} is a group-buy/preorder component. The layout target matches, but final specifications are incomplete until release. Specifications and shipping dates may change, compatibility data may be incomplete, and this part may be sold as part of a kit or set. Confirm what is included before adding it to the build.`,
        sourceReferences,
      });
    }

    if (part.groupBuy) {
      return new CompatibilityResult({
        partId: part.id,
        status: "conditional",
        confidenceLevel: "Medium",
        explanation: `${part.name} appears to match the build, but it is still a group-buy item and should be included with caution.`,
        sourceReferences,
      });
    }

    const replacementText = build.selectedParts[part.category]
      ? ` It will replace ${build.selectedParts[part.category].name} in the ${part.category} slot.`
      : "";
    const hardwareParts = [part, ...Object.values(build.selectedParts)].filter((selectedPart) =>
      hardwareCategories.has(selectedPart.category),
    );
    const hardwareReason =
      hardwareCategories.has(part.category) && hardwareParts.length > 0
        ? ` Hardware alignment is valid because the selected case, PCB, and plate parts checked so far use the ${part.compatibilityFamily} compatibility family and ${part.mountType} mounting style.`
        : " MX-style switch and keycap checks do not conflict with the current layout or selected hardware.";

    return new CompatibilityResult({
      partId: part.id,
      status: "compatible",
      confidenceLevel: "High",
      explanation: `Compatible because ${part.name} supports the selected ${build.layout.name} layout and does not conflict with the current build.${hardwareReason}${replacementText}`,
      sourceReferences,
    });
  }

  // Core compatibility rule from the UML support class: layout is checked first,
  // then hardware family conflicts are checked across case, PCB, and plate.
  findHardwareConflict(build, part) {
    if (!hardwareCategories.has(part.category)) {
      return null;
    }

    return Object.values(build.selectedParts).find((selectedPart) => {
      if (selectedPart.category === part.category) {
        return false;
      }

      if (!hardwareCategories.has(selectedPart.category)) {
        return false;
      }

      return selectedPart.compatibilityFamily !== part.compatibilityFamily;
    });
  }
}
