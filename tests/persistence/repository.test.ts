import {
	computeInputDigest,
	ResultSchema,
	type Bundle,
	type CalculationResult
} from '../../src/lib/contracts';
import { goldenBundle } from '../../src/lib/fixtures';
import {
	MemoryPersistenceStorage,
	PersistenceImportError,
	PersistenceRepository,
	PersistenceStorageError
} from '../../src/lib/persistence';
import { describe, expect, it } from 'vitest';

function clone<T>(value: T): T {
	return structuredClone(value);
}

function makeResult(
	bundle: Bundle,
	scenarioId: string,
	runs: string,
	version = 'engine-v1'
): CalculationResult {
	const scenario = [bundle.comparison.baseline, ...bundle.comparison.candidates].find(
		(candidate) => candidate.id === scenarioId
	);
	if (!scenario) throw new Error(`missing scenario ${scenarioId}`);
	return ResultSchema.parse({
		calculationVersion: version,
		inputDigest: computeInputDigest(bundle),
		scenarioId,
		scenarioRevision: scenario.revision,
		feasibility: 'feasible',
		issues: [],
		workload: [],
		coverage: [],
		offense: { status: 'available', runs, reasons: [] },
		constraints: {
			rosterSize: { status: 'passed', reasons: [] },
			cost: { status: 'unchecked', reasons: [] }
		},
		readiness: { ready: false, scope: 'coverage', blockingCodes: ['ACKNOWLEDGMENT_REQUIRED'] }
	});
}

function bundleWithResult(runs = '6.4'): Bundle {
	const bundle = clone(goldenBundle);
	const result = makeResult(bundle, 'baseline', runs);
	bundle.results = [result];
	return bundle;
}

function repository(
	storage = new MemoryPersistenceStorage(),
	options: ConstructorParameters<typeof PersistenceRepository>[1] = {}
): PersistenceRepository {
	return new PersistenceRepository(storage, {
		clock: () => '2026-09-19T12:00:00Z',
		...options
	});
}

describe('versioned persistence repository', () => {
	it('round-trips a self-contained bundle and preserves exact results and history', async () => {
		const storage = new MemoryPersistenceStorage();
		const source = repository(storage);
		const first = bundleWithResult();
		await source.save(first);

		const edited = clone(first);
		edited.comparison.revision += 1;
		edited.comparison.baseline.revision += 1;
		edited.results[0]!.scenarioRevision = edited.comparison.baseline.revision;
		edited.results[0]!.inputDigest = computeInputDigest(edited);
		await source.save(edited);

		const exported = await source.exportJson(first.bundleId);
		const restoredStorage = new MemoryPersistenceStorage();
		const restored = repository(restoredStorage);
		const imported = await restored.importJson(exported);

		expect(imported.status).toBe('imported');
		if (imported.status === 'conflict') return;
		expect(imported.record.revisions).toHaveLength(2);
		expect(imported.current.bundle).toEqual(edited);
		expect(imported.current.inputDigest).toBe(computeInputDigest(edited));
		expect(imported.current.calculationVersions).toEqual(['engine-v1']);
		expect((await restored.load(first.bundleId))?.record.revisions).toHaveLength(2);
	});

	it('rejects unsupported persistence versions without changing existing records', async () => {
		const storage = new MemoryPersistenceStorage();
		const repo = repository(storage);
		await repo.save(goldenBundle);
		const unsupported = JSON.parse(await repo.exportJson(goldenBundle.bundleId)) as Record<
			string,
			unknown
		>;
		unsupported.persistenceVersion = '2.0';

		await expect(repo.importJson(JSON.stringify(unsupported))).rejects.toMatchObject({
			name: 'PersistenceImportError',
			issues: [expect.objectContaining({ code: 'UNSUPPORTED_VERSION' })]
		});
		expect((await repo.load(goldenBundle.bundleId))?.current.bundle).toEqual(goldenBundle);
	});

	it('rejects malformed imports atomically and leaves the current workspace intact', async () => {
		const storage = new MemoryPersistenceStorage();
		const repo = repository(storage);
		await repo.save(goldenBundle);
		const malformed = JSON.parse(await repo.exportJson(goldenBundle.bundleId)) as Record<
			string,
			unknown
		>;
		const revisions = malformed.revisions as Array<Record<string, unknown>>;
		revisions[0]!.inputDigest = 'not-a-digest';

		const error = await repo
			.importJson(JSON.stringify(malformed))
			.catch((candidate: unknown) => candidate);
		expect(error).toBeInstanceOf(PersistenceImportError);
		expect((await repo.load(goldenBundle.bundleId))?.current.bundle).toEqual(goldenBundle);
	});

	it('detects a stale cached result through the replay boundary and never replaces it silently', async () => {
		const stale = bundleWithResult('99.9');
		const expected = bundleWithResult('6.4');
		const repo = repository(new MemoryPersistenceStorage(), {
			supportedCalculationVersions: ['engine-v1'],
			replay: ({ bundle }) => makeResult(bundle, 'baseline', '6.4')
		});

		const imported = await repo.importBundle(stale);
		expect(imported.status).toBe('imported');
		if (imported.status === 'conflict') return;
		expect(imported.replay.status).toBe('replay-mismatch');
		expect(imported.replay.issues).toContainEqual(
			expect.objectContaining({ code: 'REPLAY_MISMATCH', path: '/results/0' })
		);
		expect(imported.current.bundle.results[0]!.offense.runs).toBe('99.9');

		const conflict = await repo.importBundle(expected);
		expect(conflict.status).toBe('conflict');
		if (conflict.status !== 'conflict') return;
		expect(conflict.existing.revisions).toHaveLength(1);
		expect((await repo.load(stale.bundleId))?.current.bundle.results[0]!.offense.runs).toBe('99.9');
	});

	it('labels a supported-schema bundle as historical when its calculation version is unavailable', async () => {
		const bundle = bundleWithResult();
		const repo = repository(new MemoryPersistenceStorage(), {
			supportedCalculationVersions: ['engine-v2'],
			replay: () => undefined
		});

		const imported = await repo.importBundle(bundle);
		expect(imported.status).toBe('imported');
		if (imported.status === 'conflict') return;
		expect(imported.replay.status).toBe('historical');
		expect(imported.replay.entries[0]).toMatchObject({ status: 'unavailable' });
		expect(imported.replay.issues[0]).toMatchObject({ code: 'REPLAY_UNAVAILABLE' });
	});

	it('requires explicit replace-as-new-revision for duplicate bundle IDs', async () => {
		const repo = repository(new MemoryPersistenceStorage());
		const first = clone(goldenBundle);
		const second = clone(goldenBundle);
		second.createdAt = '2026-09-20T12:00:00Z';

		await repo.importBundle(first);
		const conflict = await repo.importBundle(second);
		expect(conflict.status).toBe('conflict');
		const replaced = await repo.importBundle(second, { replaceAsNewRevision: true });
		expect(replaced.status).toBe('replaced-as-new-revision');
		if (replaced.status === 'conflict') return;
		expect(replaced.record.revisions).toHaveLength(2);
		expect(replaced.record.currentStoredRevision).toBe(2);
	});

	it('does not report a saved state when the storage write fails', async () => {
		const storage = new MemoryPersistenceStorage();
		const repo = repository(storage);
		storage.failNextPut(new Error('quota exceeded'));

		await expect(repo.save(goldenBundle)).rejects.toBeInstanceOf(PersistenceStorageError);
		expect(await repo.load(goldenBundle.bundleId)).toBeNull();
		await expect(repo.exportJson(goldenBundle.bundleId)).rejects.toThrow(/not found/);
	});

	it('exports a raw contract bundle for portable interchange as well as the history envelope', async () => {
		const repo = repository(new MemoryPersistenceStorage());
		await repo.save(goldenBundle);

		const raw = await repo.exportBundleJson(goldenBundle.bundleId);
		const imported = await repository(new MemoryPersistenceStorage()).importJson(raw);
		expect(imported.status).toBe('imported');
		if (imported.status === 'conflict') return;
		expect(imported.current.bundle).toEqual(goldenBundle);
	});
});
