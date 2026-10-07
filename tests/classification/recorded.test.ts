import { describe, expect, it } from 'vitest';
import {
	EMPTY_RESULTS,
	PROFILE_LABELS,
	buildProfileRequest,
	classifyProfile,
	clearClassificationCache,
	mergeResults,
	recordKey,
	recordedFor,
	requestDigest,
	requestsToAsk,
	serializeResults,
	type JevRecord,
	type JevProvider,
	type ProfileEvidence,
	type RecordedResults
} from '../../src/lib/classification';

// D-58: CI records answers; the app replays them by exact request digest.
const evidence = (playerId: string, rate = '0.12'): ProfileEvidence => ({
	playerId,
	name: `Player ${playerId}`,
	bats: 'R',
	eligiblePositions: ['2B'],
	age: null,
	rate,
	rateLabel: 'observed R/PA',
	seasonPA: 400,
	split: null,
	notes: null
});
const request = (playerId: string, rate?: string) =>
	buildProfileRequest(evidence(playerId, rate), 'jev-latest');

const provider: JevProvider = {
	id: 'test:fake',
	send: () =>
		Promise.resolve({
			model: 'jev-1.13.0',
			answers: {
				profile: {
					type: 'choice',
					choice: 'Star',
					probabilities: Object.fromEntries(PROFILE_LABELS.map((l, i) => [l, i === 0 ? 1 : 0])),
					confidence: 1
				},
				evidence_sufficient: { type: 'noul', noul: 0.9 }
			},
			usage: { input_tokens: 100, output_tokens: 5 }
		})
};
async function answer(playerId: string, rate?: string): Promise<JevRecord> {
	clearClassificationCache();
	return classifyProfile(evidence(playerId, rate), { provider, acknowledged: true });
}

describe('recorded results', () => {
	it('asks only for distinct requests with no usable answer', async () => {
		const a = await answer('a');
		const results: RecordedResults = mergeResults([request('a')], EMPTY_RESULTS, [a]);
		const toAsk = requestsToAsk([request('a'), request('b'), request('b')], results);
		expect(toAsk.map((r) => requestDigest(r))).toEqual([requestDigest(request('b'))]);
	});

	it('replays an answer only for the exact request', async () => {
		const a = await answer('a');
		const results = mergeResults([request('a')], EMPTY_RESULTS, [a]);
		expect(recordedFor(results, request('a'))?.answer?.label).toBe('Star');
		// Changed evidence is a different digest, so the old answer is not shown for it.
		expect(recordedFor(results, request('a', '0.13'))).toBeNull();
		expect(recordedFor(EMPTY_RESULTS, request('a'))).toBeNull();
	});

	it('never records a failed or non-current result', async () => {
		const a = await answer('a');
		const failed: JevRecord = { ...a, status: 'error', answer: null };
		expect(mergeResults([request('a')], EMPTY_RESULTS, [failed]).records).toEqual({});
	});

	it('keeps answers for current requests, drops stale ones, and is stable in digest order', async () => {
		const a = await answer('a');
		const b = await answer('b');
		const first = mergeResults([request('a'), request('b')], EMPTY_RESULTS, [a, b]);
		// Data moved on: only b is still needed; a is dropped, b is kept without being re-asked.
		const second = mergeResults([request('b')], first, []);
		expect(Object.keys(second.records)).toEqual([recordKey(request('b'))]);
		// Nothing new: a rerun reproduces the same file, so CI commits nothing.
		expect(JSON.stringify(mergeResults([request('b')], second, []))).toBe(JSON.stringify(second));
		expect(Object.keys(first.records)).toEqual(Object.keys(first.records).sort());
	});

	it('serializes one record per line and round-trips', async () => {
		const a = await answer('a');
		const b = await answer('b');
		const results = mergeResults([request('a'), request('b')], EMPTY_RESULTS, [a, b]);
		const text = serializeResults(results);
		expect(JSON.parse(text)).toEqual(results);
		expect(text.split('\n')).toHaveLength(8);
		expect(serializeResults(EMPTY_RESULTS)).toBe(
			'{\n\t"version": "jev-results-v1",\n\t"records": {}\n}\n'
		);
		// A stored record carries no request; the replay rebuilds it from the snapshot.
		expect(Object.values(results.records)[0]).not.toHaveProperty('request');
		expect(recordedFor(results, request('a'))?.request).toEqual(request('a'));
		expect(recordedFor(results, request('a'))?.requestDigest).toBe(requestDigest(request('a')));
	});
});
