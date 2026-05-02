const soundTraitTargets = {
  balanced: [],
  clacky: ["clacky", "bright"],
  deep: ["deep", "muted"],
  thocky: ["deep", "muted", "soft"],
  quiet: ["muted", "soft"],
};

const feelTraitTargets = {
  firm: ["firm"],
  linear: ["linear", "smooth"],
  soft: ["soft"],
  tactile: ["tactile"],
};

const opposingTraits = {
  clacky: ["deep", "muted"],
  deep: ["clacky", "bright"],
  thocky: ["bright", "clacky"],
  quiet: ["clacky", "bright"],
  firm: ["soft"],
  linear: ["tactile"],
  soft: ["firm"],
  tactile: ["linear", "smooth"],
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function formatList(values) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

export function getPreferenceTargets({ desiredSoundProfile, desiredTypingFeel }) {
  return unique([
    ...(soundTraitTargets[desiredSoundProfile] ?? []),
    ...(feelTraitTargets[desiredTypingFeel] ?? []),
  ]);
}

export function analyzePreferenceMatch(parts, preferences) {
  const selectedParts = parts.filter(Boolean);

  if (selectedParts.length === 0) {
    return {
      level: "Low",
      score: 0,
      dominantTraits: [],
      matchingReasons: [],
      explanation:
        "Preference Match: Low. Add parts to estimate sound and typing feel from the combined build.",
    };
  }

  const targetTraits = getPreferenceTargets(preferences);
  const conflictTraits = unique([
    ...(opposingTraits[preferences.desiredSoundProfile] ?? []),
    ...(opposingTraits[preferences.desiredTypingFeel] ?? []),
  ]);
  const contributions = selectedParts.flatMap((part) =>
    (part.traits ?? []).map((trait) => ({
      trait,
      partName: part.name,
      reason: part.traitReason ?? part.name,
    })),
  );
  const traitCounts = contributions.reduce((counts, contribution) => {
    counts[contribution.trait] = (counts[contribution.trait] ?? 0) + 1;
    return counts;
  }, {});
  const dominantTraits = Object.entries(traitCounts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 3)
    .map(([trait]) => trait);
  const matchingContributions = contributions.filter((contribution) =>
    targetTraits.includes(contribution.trait),
  );
  const conflictingContributions = contributions.filter((contribution) =>
    conflictTraits.includes(contribution.trait),
  );
  const matchingReasons = unique(matchingContributions.map((contribution) => contribution.reason));
  const score = matchingContributions.length - conflictingContributions.length * 0.6;

  let level = "Low";
  if (score >= 3 && matchingReasons.length >= 2) {
    level = "High";
  } else if (score >= 1 || matchingContributions.length >= 2) {
    level = "Medium";
  }

  const trendText = dominantTraits.length
    ? `trends ${formatList(dominantTraits)}`
    : "does not have enough sound or feel traits yet";
  const preferenceText = unique([
    preferences.desiredSoundProfile !== "balanced" ? preferences.desiredSoundProfile : null,
    preferences.desiredTypingFeel,
  ]);
  const targetText = preferenceText.length
    ? formatList(preferenceText)
    : "the selected preferences";
  const reasonText = matchingReasons.length
    ? ` because it combines ${formatList(matchingReasons.slice(0, 4))}`
    : "";
  const explanation =
    level === "Low"
      ? `Preference Match: ${level}. This build ${trendText}, but it does not strongly match ${targetText} yet. Sound and feel are estimated from the combined case, plate, switches, keycaps, mounting style, and related attributes.`
      : `Preference Match: ${level}. This build ${trendText}${reasonText}. Sound and feel are estimated from the combined case, plate, switches, keycaps, mounting style, and related attributes.`;

  return {
    level,
    score,
    dominantTraits,
    matchingReasons,
    explanation,
  };
}
