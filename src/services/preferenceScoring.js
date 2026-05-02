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

export const soundTraitOrder = ["deep", "clacky", "muted", "bright"];
export const feelTraitOrder = ["soft", "firm", "tactile", "smooth"];
export const visibleTraitOrder = [...soundTraitOrder, ...feelTraitOrder];

const visibleTraitSet = new Set(visibleTraitOrder);
const soundTraitSet = new Set(soundTraitOrder);
const feelTraitSet = new Set(feelTraitOrder);

const traitLabels = {
  bright: "Bright",
  clacky: "Clacky",
  deep: "Deep",
  firm: "Firm",
  muted: "Muted",
  smooth: "Smooth",
  soft: "Soft",
  tactile: "Tactile",
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

export function formatTraitName(trait) {
  return traitLabels[trait] ?? trait;
}

export function getPartTraitPreview(part) {
  const contributedTraits = unique((part.traits ?? []).filter((trait) => visibleTraitSet.has(trait)));
  const soundTraits = contributedTraits.filter((trait) => soundTraitSet.has(trait));
  const feelTraits = contributedTraits.filter((trait) => feelTraitSet.has(trait));
  const highestTrait = contributedTraits[0] ?? null;
  const contributedTraitLabels = contributedTraits.map(formatTraitName);

  return {
    highestTrait,
    highestTraitLabel: highestTrait ? formatTraitName(highestTrait) : "Neutral",
    highestSoundTrait: soundTraits[0] ?? null,
    highestSoundTraitLabel: soundTraits[0] ? formatTraitName(soundTraits[0]) : "Neutral",
    highestFeelTrait: feelTraits[0] ?? null,
    highestFeelTraitLabel: feelTraits[0] ? formatTraitName(feelTraits[0]) : "Neutral",
    contributedTraits,
    soundTraits,
    feelTraits,
    contributionLabel: contributedTraitLabels.length
      ? contributedTraitLabels.join(" / ")
      : "No strong sound/feel trait",
    soundContributionLabel: soundTraits.length
      ? soundTraits.map(formatTraitName).join(" / ")
      : "No strong sound push",
    feelContributionLabel: feelTraits.length
      ? feelTraits.map(formatTraitName).join(" / ")
      : "No strong feel push",
  };
}

function scoreTraitGroup(selectedParts, traitOrder, kind, emptyDirectionLabel) {
  const traitSet = new Set(traitOrder);
  const scores = Object.fromEntries(traitOrder.map((trait) => [trait, 0]));
  const contributorsByTrait = Object.fromEntries(traitOrder.map((trait) => [trait, []]));
  const firstContributionOrder = Object.fromEntries(
    traitOrder.map((trait) => [trait, Number.POSITIVE_INFINITY]),
  );
  let contributionOrder = 0;
  const traitRank = Object.fromEntries(traitOrder.map((trait, index) => [trait, index]));
  const partImpacts = selectedParts.map((part, partIndex) => {
    const contributedTraits = getPartTraitPreview(part).contributedTraits.filter((trait) =>
      traitSet.has(trait),
    );
    const impactScore = contributedTraits.reduce((total, trait, index) => {
      const weight = index === 0 ? 1.5 : 1;

      scores[trait] += weight;
      contributorsByTrait[trait].push(part.name);
      if (firstContributionOrder[trait] === Number.POSITIVE_INFINITY) {
        firstContributionOrder[trait] = contributionOrder;
      }
      contributionOrder += 1;

      return total + weight;
    }, 0);

    return {
      part,
      partIndex,
      impactScore,
      reason: part.traitReason ?? part.name,
    };
  });
  const maxScore = Math.max(...Object.values(scores), 1);
  const rankedTraits = traitOrder
    .filter((trait) => scores[trait] > 0)
    .sort(
      (first, second) =>
        scores[second] - scores[first] ||
        firstContributionOrder[first] - firstContributionOrder[second] ||
        traitRank[first] - traitRank[second],
    );
  const topTraits = rankedTraits.slice(0, 3);
  const topTraitSet = new Set(topTraits);
  const rankedContributors = partImpacts
    .map((impact) => {
      const matchingTraitScore = getPartTraitPreview(impact.part).contributedTraits.reduce(
        (total, trait, index) => {
          if (!topTraitSet.has(trait)) {
            return total;
          }

          return total + (index === 0 ? 1.5 : 1);
        },
        0,
      );

      return {
        ...impact,
        matchingTraitScore,
      };
    })
    .filter((impact) => impact.matchingTraitScore > 0)
    .sort(
      (first, second) =>
        second.matchingTraitScore - first.matchingTraitScore ||
        second.impactScore - first.impactScore ||
        first.partIndex - second.partIndex,
    )
    .slice(0, 3)
    .map((impact) => impact.reason);
  const topContributors = unique(rankedContributors);

  return {
    bars: traitOrder.map((trait) => ({
      trait,
      kind,
      label: formatTraitName(trait),
      score: scores[trait],
      percent: scores[trait] > 0 ? Math.max((scores[trait] / maxScore) * 100, 8) : 0,
      contributorCount: contributorsByTrait[trait].length,
    })),
    dominantTraits: topTraits,
    directionLabel: topTraits.length
      ? topTraits.map(formatTraitName).join(" / ")
      : emptyDirectionLabel,
    topContributors,
    topContributorLabel: topContributors.length ? topContributors.join(", ") : "None yet",
  };
}

export function getBuildTraitProfile(parts) {
  const selectedParts = parts.filter(Boolean);
  const sound = scoreTraitGroup(
    selectedParts,
    soundTraitOrder,
    "sound",
    "Add sound-shaping parts",
  );
  const feel = scoreTraitGroup(selectedParts, feelTraitOrder, "feel", "Add feel-shaping parts");
  const topContributors = unique([...sound.topContributors, ...feel.topContributors]).slice(0, 3);

  return {
    sound,
    feel,
    bars: [...sound.bars, ...feel.bars],
    dominantTraits: unique([...sound.dominantTraits, ...feel.dominantTraits]).slice(0, 3),
    directionLabel: `Sound: ${sound.directionLabel}; Feel: ${feel.directionLabel}`,
    topContributors,
    topContributorLabel: topContributors.length ? topContributors.join(", ") : "None yet",
  };
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
