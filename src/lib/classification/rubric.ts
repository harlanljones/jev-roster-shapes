// The frozen profile rubric sent to Jev (D-47). This is a separate artifact
// from the analyst labels in `src/lib/shapes/taxonomy.ts`: the rubric is the
// question, the analyst labels are the comparison target, and neither may
// change a calculation. Definitions and boundary rules follow
// docs/SHAPE_TAXONOMY.md; the rubric version is part of the cache key, so a
// wording change never reuses a cached answer.

export const JEV_RUBRIC_VERSION = 'jev-profile-rubric-v1';

export const PROFILE_LABELS = [
	'Square',
	'Rectangle',
	'Circle',
	'Pentagon',
	'Octagon',
	'Diamond',
	'Star',
	'Funky',
	'Unclassified'
] as const;

export type ProfileLabel = (typeof PROFILE_LABELS)[number];

/** Narrow an arbitrary string to a rubric option. */
export function isProfileLabel(value: string): value is ProfileLabel {
	return (PROFILE_LABELS as readonly string[]).includes(value);
}

/**
 * One option per label, each with the plain-language definition and the
 * mechanical boundary rule, so the model can apply a recorded rule to the
 * numbers in the evidence instead of judging from memory.
 */
export const PROFILE_CRITERIA: Readonly<Record<ProfileLabel, string>> = {
	Square:
		'A steady everyday regular at one position with no platoon quirk. Choose when the evidence shows a single eligible fielding position, a full workload, and no large split gap.',
	Rectangle:
		'A high-volume workhorse carrying everyday at-bats: 550 or more plate appearances in the season, at one or more everyday positions.',
	Circle:
		'A well-rounded utility player who is eligible at two or more positions but has no everyday slot and no platoon quirk.',
	Pentagon: 'A young flash, 25 or under, with extra-base or speed electricity and high variance.',
	Octagon: 'A defensive anchor: the shortstop-grade glove the infield is built around.',
	Diamond:
		'High value but fragile: an above-median rate with an injury-limited season of fewer than 300 plate appearances.',
	Star: 'A quirky or tough fit, not a star player: a hitter who is much better against one hand than the other, so he fills a slot snugly only as half of a platoon. Recorded rule: a gap of at least .200 OPS between his rates against left- and right-handed pitching, with 50 or more plate appearances on each side. Production level alone never makes a Star.',
	Funky:
		'An irregular profile: a designated-hitter-only bat with no fielding position of 10 or more games, or a fringe bat under 100 plate appearances.',
	Unclassified:
		'The evidence is missing: zero plate appearances and no eligible position. Never guess a label the evidence cannot support.'
};

export const PROFILE_INSTRUCTION =
	'Which single profile label describes this position player under the rubric above? ' +
	'Answer only from the supplied observations. Do not estimate plate appearances, runs, defensive value, or transaction value, and do not describe the player in prose.';

export const EVIDENCE_SUFFICIENT_INSTRUCTION =
	'Do the supplied observations contain enough evidence to apply the profile rubric to this player without guessing?';

export const EVIDENCE_SUFFICIENT_CRITERIA = {
	true: 'The observations state position eligibility, a rate or an explicit absence of one, and enough season or split volume to apply the rubric.',
	false:
		'A required observation is missing or too small to apply a boundary rule, so any label would be a guess.'
} as const;

/** One option per label, for building a Choice question's criteria map. */
export function profileCriteriaMap(): Record<ProfileLabel, string> {
	return { ...PROFILE_CRITERIA };
}
