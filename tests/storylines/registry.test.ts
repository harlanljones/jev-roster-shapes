import { computeInputDigest, validateBundle } from '../../src/lib/contracts';
import { calculateComparison } from '../../src/lib/engine';
import { shapeOf } from '../../src/lib/shapes/taxonomy';
import {
	getStoryline,
	PINNED_STORYLINE_DIGESTS,
	storylineRegistry
} from '../../src/lib/storylines/registry';
import { describe, expect, it } from 'vitest';

describe('2026 storyline registry', () => {
	it('publishes the five storyline slugs in library order', () => {
		expect(storylineRegistry.map(({ slug }) => slug)).toEqual([
			'preseason-dh',
			'preseason-second',
			'july-run',
			'deadline-catcher',
			'october-lineup'
		]);
		expect(storylineRegistry.map(({ bundle }) => bundle.bundleId)).toEqual([
			'mlbam-bos-2026-preseason-dh',
			'mlbam-bos-2026-preseason-second',
			'mlbam-bos-2026-july-run',
			'mlbam-bos-2026-deadline-catcher',
			'mlbam-bos-2026-october-lineup'
		]);
	});

	it('pins each input digest so content changes fail loudly', () => {
		expect(new Set(storylineRegistry.map(({ bundle }) => bundle.bundleId)).size).toBe(
			storylineRegistry.length
		);
		for (const storyline of storylineRegistry) {
			const validation = validateBundle(storyline.bundle);
			expect(validation.success, storyline.slug).toBe(true);
			if (!validation.success) continue;
			expect(storyline.inputDigest, storyline.slug).toBe(computeInputDigest(validation.data));
			expect(storyline.inputDigest, storyline.slug).toBe(
				PINNED_STORYLINE_DIGESTS[storyline.slug as keyof typeof PINNED_STORYLINE_DIGESTS]
			);
			expect(validation.data.dataClass).toBe('public');
			expect(validation.data.results).toHaveLength(0);
			expect(validation.data.comparison.candidates).toHaveLength(2);
		}
	});

	it('matches every hand-derived D-42 expectation through the real engine', () => {
		for (const storyline of storylineRegistry) {
			const calculation = calculateComparison(storyline.bundle);
			const runs = new Map(
				calculation.results.map((result) => [result.scenarioId, result.offense.runs])
			);
			const deltas = new Map(
				calculation.offenseDeltas.map((delta) => [delta.scenarioId, delta.runs])
			);
			for (const expected of storyline.expected) {
				expect(
					runs.get(expected.scenarioId) ?? null,
					`${storyline.slug}/${expected.scenarioId}`
				).toBe(expected.offenseRuns);
				if (expected.scenarioId === 'base') {
					expect(deltas.get(expected.scenarioId) ?? null).toBe('0');
				} else {
					expect(
						deltas.get(expected.scenarioId) ?? null,
						`${storyline.slug}/${expected.scenarioId} delta`
					).toBe(expected.offenseDelta);
				}
				expect(
					calculation.results.find((result) => result.scenarioId === expected.scenarioId)
						?.feasibility
				).toBe('feasible');
			}
			expect(
				calculation.results.every(
					(result) =>
						result.readiness.ready === false &&
						result.readiness.blockingCodes.includes('ACKNOWLEDGMENT_REQUIRED')
				),
				`${storyline.slug} readiness`
			).toBe(true);
		}
	});

	it('scores Casas from his 2025 rate before Opening Day', () => {
		const storyline = getStoryline('preseason-dh');
		if (!storyline) throw new Error('preseason-dh storyline missing');
		expect(storyline.bundle.assumptions.metricDefinitionId).toBe('mlbam-observed-r-per-pa-2025');
		const casas = storyline.bundle.dataset.projections.find(
			({ playerId }) => playerId === 'mlbam-671213'
		);
		expect(casas?.overall).not.toBeNull();
		const result = calculateComparison(storyline.bundle).results.find(
			({ scenarioId }) => scenarioId === 'cand-b'
		);
		expect(result?.offense.status).toBe('available');
		expect(result?.coverage.every(({ shortfallOuts }) => shortfallOuts === 0)).toBe(true);
	});

	it('labels every rostered player with a rubric shape without touching results', () => {
		for (const storyline of storylineRegistry) {
			const before = JSON.stringify(calculateComparison(storyline.bundle).results);
			for (const scenario of [
				storyline.bundle.comparison.baseline,
				...storyline.bundle.comparison.candidates
			]) {
				for (const memberId of scenario.memberIds) {
					expect(shapeOf(memberId).shape, `${storyline.slug}/${memberId}`).not.toBe('');
				}
			}
			// C-21 equivalent: advisory shape lookups cannot alter assignments or results.
			const after = JSON.stringify(calculateComparison(storyline.bundle).results);
			expect(after).toBe(before);
		}
		expect(shapeOf('mlbam-671213').shape).toBe('Unclassified');
	});

	it('keeps each roster to players Boston could use on the decision date', () => {
		const ids = (slug: string) =>
			getStoryline(slug)?.bundle.dataset.players.map((player) => player.id) ?? [];
		const rutschman = 'mlbam-668939';
		const narvaez = 'mlbam-665966';
		for (const slug of ['preseason-dh', 'preseason-second', 'july-run']) {
			expect(ids(slug), slug).not.toContain(rutschman);
			expect(ids(slug), slug).toContain(narvaez);
		}
		// Rutschman arrives in the deadline trade; Narváez leaves in it.
		expect(ids('deadline-catcher')).toContain(rutschman);
		expect(ids('october-lineup')).toContain(rutschman);
		expect(ids('october-lineup')).not.toContain(narvaez);
	});
});
