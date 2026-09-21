import { describe, expect, it } from 'vitest';

import { calculateComparison, calculateScenario } from '../../src/lib/engine';
import { getStoryline } from '../../src/lib/storylines/registry';
import { MemoryPersistenceStorage, PersistenceRepository } from '../../src/lib/persistence';
import { buildComparisonViewModel } from '../../src/lib/app/workspace';

const storyline = getStoryline('power-vacuum');
if (!storyline) throw new Error('power-vacuum storyline missing');

function clone<T>(value: T): T {
	return structuredClone(value);
}

function repository(storage = new MemoryPersistenceStorage()): PersistenceRepository {
	return new PersistenceRepository(storage, {
		clock: () => '2026-09-19T12:00:00Z',
		supportedCalculationVersions: ['deterministic-engine-v1'],
		replay: ({ bundle, scenarioId }) => calculateScenario(bundle, scenarioId)
	});
}

describe('comparison integration journey', () => {
	it('calculates, edits, saves, reloads, exports, and reimports one comparison', async () => {
		const initial = clone(storyline.bundle);
		const initialCalculation = calculateComparison(initial);
		initial.results = [...initialCalculation.results];

		const storage = new MemoryPersistenceStorage();
		const source = repository(storage);
		await source.save(initial);

		const edited = clone(initial);
		const candidate = edited.comparison.candidates[0]!;
		const allocation = candidate.allocations.find((item) => item.templateId === 'bos26-vs-left')!;
		allocation.assignments.find((item) => item.order === 3)!.playerId = null;
		candidate.revision += 1;
		edited.comparison.revision += 1;
		edited.results = [...calculateComparison(edited).results];

		const saved = await source.save(edited);
		expect(saved.status).toBe('saved');
		expect(saved.record.revisions).toHaveLength(2);
		expect(saved.current.bundle.comparison.candidates[0]!.revision).toBe(2);
		expect(
			saved.current.bundle.results.find((result) => result.scenarioId === 'cand-a')?.feasibility
		).toBe('incomplete');

		const model = buildComparisonViewModel(
			saved.current.bundle,
			calculateComparison(saved.current.bundle),
			'cand-a',
			'saved',
			undefined,
			saved.current.savedAt,
			false
		);
		expect(model.activeScenarioId).toBe('cand-a');
		expect(model.scenarios).toHaveLength(3);
		expect(model.scenarios.find((scenario) => scenario.id === 'cand-a')?.offense.status).toBe(
			'unavailable'
		);
		expect(model.scenarios.find((scenario) => scenario.id === 'cand-a')?.unsaved).toBe(false);

		const raw = await source.exportBundleJson(edited.bundleId);
		const restored = repository(new MemoryPersistenceStorage());
		const imported = await restored.importJson(raw);
		if (imported.status === 'conflict') throw new Error('fresh repository unexpectedly conflicted');
		expect(imported.status).toBe('imported');
		expect(imported.replay.status).toBe('verified');
		expect(imported.current.bundle).toEqual(edited);
	});
});
