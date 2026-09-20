import {
	BundleValidationError,
	canonicalize,
	computeInputDigest,
	parseBundle,
	validateBundle
} from '../../src/lib/contracts';
import { goldenBundle } from '../../src/lib/fixtures';
import { describe, expect, it } from 'vitest';

describe('v1 bundle contract', () => {
	it('accepts the golden input and preserves the synthetic boundary', () => {
		const result = validateBundle(goldenBundle);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.dataClass).toBe('synthetic');
		expect(result.data.results).toHaveLength(0);
		expect(result.issues).toEqual([]);
	});

	it('rejects unknown fields atomically with an RFC 6901 path', () => {
		const input = structuredClone(goldenBundle) as Record<string, unknown>;
		input.typo = true;

		const result = validateBundle(input);

		expect(result.success).toBe(false);
		expect(result.issues[0]).toMatchObject({ code: 'INVALID_SCHEMA', path: '/typo' });
	});

	it('rejects unsupported schema versions', () => {
		const input = structuredClone(goldenBundle) as { schemaVersion: string };
		input.schemaVersion = '2.0';

		const result = validateBundle(input);

		expect(result.success).toBe(false);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: 'UNSUPPORTED_VERSION', path: '/schemaVersion' })
		);
	});

	it('keeps valid domain drafts importable', () => {
		const input = parseBundle(goldenBundle);
		const allocation = input.comparison.baseline.allocations[0];
		if (!allocation) throw new Error('golden fixture has no allocation');
		const assignment = allocation.assignments.find(({ order }) => order === 8);
		if (!assignment) throw new Error('golden fixture has no RF slot');
		assignment.playerId = null;

		const result = validateBundle(input);

		expect(result.success).toBe(true);
		expect(result.issues).toEqual([]);
	});

	it('rejects unresolved structural references but does not mutate the input', () => {
		const input = parseBundle(goldenBundle);
		const projection = input.dataset.projections[0];
		if (!projection) throw new Error('golden fixture has no projection');
		projection.playerId = 'missing-player';
		const before = projection.playerId;

		const result = validateBundle(input);

		expect(result.success).toBe(false);
		expect(result.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_REFERENCE' }));
		expect(projection.playerId).toBe(before);
	});

	it('computes the digest from only replay inputs and canonical object order', () => {
		const bundle = parseBundle(goldenBundle);
		const reordered = {
			comparison: bundle.comparison,
			assumptions: bundle.assumptions,
			dataset: bundle.dataset,
			sources: bundle.sources,
			dataClass: bundle.dataClass,
			schemaVersion: bundle.schemaVersion
		};

		expect(canonicalize(reordered)).toBe(canonicalize({ ...reordered }));
		const withDifferentResults = { ...bundle, results: [] };
		expect(computeInputDigest(bundle)).toBe(computeInputDigest(withDifferentResults));
		expect(computeInputDigest(bundle)).toMatch(/^[0-9a-f]{64}$/);
	});

	it('throws a typed error from parseBundle on import rejection', () => {
		expect(() => parseBundle({})).toThrow(BundleValidationError);
	});
});
