// The evidence a classification request is allowed to carry (D-47). The app
// decides what a player's evidence *is*: the bundle's own dated rate, the
// approved eligibility, and the display-layer split snapshot, each labeled with
// where it came from. Two things are deliberately withheld:
//
//   • the analyst's shape label and its rationale, because they are the
//     comparison target — putting them in the prompt would make the comparison
//     circular;
//   • anything the sources do not supply, so a missing value stays missing
//     instead of becoming a plausible number.
import type { Bundle } from '$lib/contracts';
import type { ProfileEvidence } from '$lib/classification';
import type { Storyline } from '$lib/storylines/registry';
import type { CasePlayer } from './shape-case';
import { SPLIT_SOURCE } from './split-evidence';

const METRIC_LABELS: Readonly<Record<string, string>> = {
	'mlbam-observed-r-per-pa-2025': 'Observed runs per PA (2025 season)',
	'mlbam-observed-r-per-pa-2026': 'Observed runs per PA (2026 season to date)'
};

export function rateLabel(bundle: Bundle): string {
	const metricId = bundle.assumptions.metricDefinitionId;
	return METRIC_LABELS[metricId] ?? `Observed metric ${metricId}`;
}

/** The provenance sentence every request carries, so the prompt is self-describing. */
export function provenanceNote(story: Storyline): string {
	return (
		`Rate and eligibility come from the ${story.bundle.bundleId} bundle, dated ${story.asOf}. ` +
		`Season splits come from ${SPLIT_SOURCE.label} (display-only snapshot, not the bundle's metric). ` +
		'Age is not in the sources, and no analyst label is included in this request.'
	);
}

export function evidenceFor(bundle: Bundle, player: CasePlayer, note: string): ProfileEvidence {
	return {
		playerId: player.id,
		name: player.name,
		bats: player.bats,
		eligiblePositions: player.elig,
		age: null,
		rate: player.rateText,
		rateLabel: rateLabel(bundle),
		seasonPA: player.split ? player.split.vL.pa + player.split.vR.pa : null,
		split: player.split
			? {
					vsLeft: { pa: player.split.vL.pa, ops: player.split.vL.ops },
					vsRight: { pa: player.split.vR.pa, ops: player.split.vR.ops }
				}
			: null,
		notes: note
	};
}
