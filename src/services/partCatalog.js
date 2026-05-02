import { layouts, parts } from "../data/mockData.js";
import { GroupBuyPart, Layout, Part } from "../models/domain.js";

export class PartCatalog {
  constructor() {
    this.layouts = layouts.map((layout) => new Layout(layout));
    this.parts = parts.map((part) =>
      part.status === "group-buy" ? new GroupBuyPart(part) : new Part(part),
    );
  }

  getLayoutById(layoutId) {
    return this.layouts.find((layout) => layout.id === layoutId);
  }

  getPartById(partId) {
    return this.parts.find((part) => part.id === partId);
  }

  getBrands() {
    return [...new Set(this.parts.map((part) => part.brand))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  findMatchingParts({ category = "all", query = "", layoutId = "all", brand = "all" }) {
    const normalizedQuery = query.trim().toLowerCase();

    return this.parts.filter((part) => {
      const categoryMatches = category === "all" || part.category === category;
      const brandMatches = brand === "all" || part.brand === brand;
      const layoutMatches = layoutId === "all" || part.supportsLayout(layoutId);
      const searchableText = [
        part.name,
        part.brand,
        part.version,
        part.mountType,
        part.compatibilityFamily,
        ...(part.traits ?? []),
        ...(part.specs ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const queryMatches = !normalizedQuery || searchableText.includes(normalizedQuery);

      return categoryMatches && brandMatches && layoutMatches && queryMatches;
    });
  }

  findAlternatives({ category, layoutId, excludingPartId, compatibilityFamily }) {
    return this.parts
      .filter((part) => {
        const sameCategory = part.category === category;
        const differentPart = part.id !== excludingPartId;
        const supportsLayout = !layoutId || part.supportsLayout(layoutId);
        const sameFamily = !compatibilityFamily || part.compatibilityFamily === compatibilityFamily;

        return sameCategory && differentPart && supportsLayout && sameFamily;
      })
      .slice(0, 3);
  }
}
