import {
	BundleValidationError,
	canonicalize,
	computeInputDigest,
	parseBundle,
	validateBundle
} from '../../src/lib/contracts';
import { storylineRegistry } from '../../src/lib/storylines/registry';
import { describe, expect, it } from 'vitest';

const storylineBundle = storylineRegistry[0]?.bundle;
if (!storylineBundle) throw new Error('power-vacuum storyline missing');

describe('v1 bundle contract', () => {
	it('accepts the power-vacuum storyline input and preserves the public boundary', () => {
		const result = validateBundle(storylineBundle);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.dataClass).toBe('public');
		expect(result.data.results).toHaveLength(0);
		expect(result.data.comparison.candidates).toHaveLength(2);
		expect(result.issues).toEqual([]);
	});

	it('rejects unknown fields atomically with an RFC 6901 path', () => {
		const input = structuredClone(storylineBundle) as Record<string, unknown>;
		input.typo = true;

		const result = validateBundle(input);

		expect(result.success).toBe(false);
		expect(result.issues[0]).toMatchObject({ code: 'INVALID_SCHEMA', path: '/typo' });
	});

	it('rejects unsupported schema versions', () => {
		const input = structuredClone(storylineBundle) as { schemaVersion: string };
		input.schemaVersion = '2.0';

		const result = validateBundle(input);

		expect(result.success).toBe(false);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: 'UNSUPPORTED_VERSION', path: '/schemaVersion' })
		);
	});

	it('keeps valid domain drafts importable', () => {
		const input = parseBundle(storylineBundle);
		const allocation = input.comparison.baseline.allocations[0];
		if (!allocation) throw new Error('storyline baseline has no allocation');
		const assignment = allocation.assignments.find(({ order }) => order === 8);
		if (!assignment) throw new Error('storyline baseline has no RF slot');
		assignment.playerId = null;

		const result = validateBundle(input);

		expect(result.success).toBe(true);
		expect(result.issues).toEqual([]);
	});

	it('rejects unresolved structural references but does not mutate the input', () => {
		const input = parseBundle(storylineBundle);
		const projection = input.dataset.projections[0];
		if (!projection) throw new Error('storyline has no projection');
		projection.playerId = 'missing-player';
		const before = projection.playerId;

		const result = validateBundle(input);

		expect(result.success).toBe(false);
		expect(result.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_REFERENCE' }));
		expect(projection.playerId).toBe(before);
	});

	it('computes the digest from only replay inputs and canonical object order', () => {
		const bundle = parseBundle(storylineBundle);
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
