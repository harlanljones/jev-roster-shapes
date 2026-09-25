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
			'offseason-infield',
			'opening-day-outfield',
			'july-run',
			'deadline',
			'wild-card-roster'
		]);
		expect(storylineRegistry.map(({ bundle }) => bundle.bundleId)).toEqual([
			'mlbam-bos-2026-offseason-infield',
			'mlbam-bos-2026-opening-day-outfield',
			'mlbam-bos-2026-july-run',
			'mlbam-bos-2026-deadline',
			'mlbam-bos-2026-wild-card-roster'
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
		const storyline = getStoryline('offseason-infield');
		if (!storyline) throw new Error('offseason-infield storyline missing');
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
		for (const slug of ['offseason-infield', 'opening-day-outfield', 'july-run']) {
			expect(ids(slug), slug).not.toContain(rutschman);
			expect(ids(slug), slug).toContain(narvaez);
		}
		// Rutschman arrives in the deadline trade; Narváez leaves in it.
		expect(ids('deadline')).toContain(rutschman);
		expect(ids('wild-card-roster')).toContain(rutschman);
		expect(ids('wild-card-roster')).not.toContain(narvaez);
	});

	it('trades Mayer only in the deadline scenario that makes the deal', () => {
		const deadline = getStoryline('deadline');
		if (!deadline) throw new Error('deadline storyline missing');
		const members = (id: string) =>
			[deadline.bundle.comparison.baseline, ...deadline.bundle.comparison.candidates].find(
				(scenario) => scenario.id === id
			)?.memberIds ?? [];
		expect(members('base')).toContain('mlbam-691785');
		expect(members('cand-a')).not.toContain('mlbam-691785');
		expect(members('cand-a')).not.toContain('mlbam-665966');
		expect(members('cand-b')).toContain('mlbam-691785');
		// Wong catches until Rutschman arrives; Rutschman never DHs here.
		for (const scenario of [
			deadline.bundle.comparison.baseline,
			...deadline.bundle.comparison.candidates
		]) {
			for (const allocation of scenario.allocations) {
				const dh = allocation.assignments.find(({ order }) => order === 9);
				expect(dh?.playerId).not.toBe('mlbam-668939');
			}
		}
	});

	it('holds every Wild Card scenario to 14 position players', () => {
		const wildCard = getStoryline('wild-card-roster');
		if (!wildCard) throw new Error('wild-card-roster storyline missing');
		const calculation = calculateComparison(wildCard.bundle);
		for (const scenario of [
			wildCard.bundle.comparison.baseline,
			...wildCard.bundle.comparison.candidates
		]) {
			expect(scenario.constraints.rosterSizeMax).toBe(14);
			expect(scenario.memberIds.length).toBeLessThanOrEqual(14);
		}
		expect(
			calculation.results.every(({ constraints }) => constraints.rosterSize.status === 'passed')
		).toBe(true);
		const contreras = 'mlbam-575929';
		expect(wildCard.bundle.comparison.candidates[1]?.memberIds).not.toContain(contreras);
	});
});
