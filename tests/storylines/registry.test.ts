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
			'power-vacuum',
			'outfield-logjam',
			'infield-reset',
			'catcher-split',
			'lefty-hole'
		]);
		expect(storylineRegistry.map(({ bundle }) => bundle.bundleId)).toEqual([
			'mlbam-bos-2026-power-vacuum',
			'mlbam-bos-2026-outfield-logjam',
			'mlbam-bos-2026-infield-reset',
			'mlbam-bos-2026-catcher-split',
			'mlbam-bos-2026-lefty-hole'
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

	it('leaves Casas offense unavailable while coverage stays comparable', () => {
		const storyline = getStoryline('power-vacuum');
		if (!storyline) throw new Error('power-vacuum storyline missing');
		const calculation = calculateComparison(storyline.bundle);
		const casas = calculation.results.find((result) => result.scenarioId === 'cand-b');
		expect(casas?.offense).toMatchObject({ status: 'unavailable', runs: null });
		expect(casas?.offense.reasons.some(({ code }) => code === 'MISSING_RATE')).toBe(true);
		expect(casas?.coverage.every(({ shortfallOuts }) => shortfallOuts === 0)).toBe(true);
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

	it('does not ship post-deadline players in refreshed scenario data', () => {
		for (const storyline of storylineRegistry) {
			const playerIds = storyline.bundle.dataset.players.map((player) => player.id);
			expect(playerIds).not.toContain('mlbam-691785');
			expect(playerIds).not.toContain('mlbam-665966');
		}
	});
});
