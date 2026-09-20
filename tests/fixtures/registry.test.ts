import { computeInputDigest, validateBundle } from '../../src/lib/contracts';
import { fixtureRegistry, goldenExpected, getFixture } from '../../src/lib/fixtures';
import { describe, expect, it } from 'vitest';

describe('synthetic fixture registry', () => {
	it('publishes stable accepted and rejected fixture IDs', () => {
		expect(fixtureRegistry.map(({ id }) => id)).toEqual([
			'golden',
			'incomplete-rf',
			'duplicate-position-draft',
			'missing-positive-rate',
			'over-capacity-draft',
			'unknown-field',
			'unsupported-version',
			'duplicate-projection-key',
			'half-filled-acknowledgment',
			'nonmember-cost'
		]);
	});

	it('pins the golden digest and hand-derived expectations without cached results', () => {
		const fixture = getFixture('golden');
		if (!fixture || !fixture.expected) throw new Error('golden fixture missing');

		const validation = validateBundle(fixture.bundle);
		if (!validation.success) throw new Error('golden fixture does not validate');
		expect(fixture.inputDigest).toBe(computeInputDigest(validation.data));
		expect(fixture.expected).toEqual(goldenExpected);
		expect(validation.data.results).toHaveLength(0);
		expect(fixture.calculationVersion).toBe('hand-derived-acceptance-v1');
	});

	it('verifies every registry entry against its declared import outcome', () => {
		expect(new Set(fixtureRegistry.map(({ bundle }) => bundle.bundleId)).size).toBe(
			fixtureRegistry.length
		);
		for (const fixture of fixtureRegistry) {
			const validation = validateBundle(fixture.bundle);
			expect(validation.success, fixture.id).toBe(fixture.expectedImport === 'accepted');
			if (validation.success) expect(computeInputDigest(validation.data)).toBe(fixture.inputDigest);
		}
	});
});
