import { sourceReferences } from "../data/mockData.js";
import { SourceReference } from "../models/domain.js";

export class SourceReferenceRepository {
  constructor() {
    this.sources = sourceReferences.map((source) => new SourceReference(source));
  }

  getSources(part) {
    const ids = part.sourceIds ?? [];
    return this.sources.filter((source) => ids.includes(source.id));
  }

  getById(sourceId) {
    return this.sources.find((source) => source.id === sourceId);
  }
}
