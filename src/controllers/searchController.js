export class SearchController {
  constructor(partCatalog) {
    this.partCatalog = partCatalog;
  }

  searchParts(filters) {
    return this.partCatalog.findMatchingParts(filters);
  }

  filterByLayout(parts, layout) {
    return parts.filter((part) => layout.matchesPart(part));
  }
}
