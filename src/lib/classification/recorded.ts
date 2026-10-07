// Recorded Jev answers (D-58). Jev is asked from CI when new snapshots reach
// main, and every validated answer is checked in beside the data it describes,
// keyed by the exact request digest. The app reads these records and never
// calls the provider, and a saved result replays without a future response. A
// record whose request, rubric, or prompt changed no longer matches its digest
// or versions, so it is simply not shown until CI asks again.
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { JEV_RUBRIC_VERSION } from './rubric';
import { PROMPT_VERSION, type JevSystemOneRequest } from './prompt';
import { requestDigest, type JevRecord } from './service';

export const RECORDED_RESULTS_VERSION = 'jev-results-v1';

/**
 * A stored record omits `request` and `requestDigest`: its key pins them, and
 * the app rebuilds both from the snapshot, so repeating the ~10 KB prompt per
 * record would only bloat the client bundle.
 */
export type StoredJevRecord = Omit<JevRecord, 'request' | 'requestDigest'>;

/** Short, stable key for a request: the SHA-256 of its canonical digest string. */
export const recordKey = (request: JevSystemOneRequest): string =>
	bytesToHex(sha256(new TextEncoder().encode(requestDigest(request))));

export interface RecordedResults {
	version: typeof RECORDED_RESULTS_VERSION;
	/** Validated `current` records only, keyed by `recordKey`. */
	records: Record<string, StoredJevRecord>;
}

export const EMPTY_RESULTS: RecordedResults = { version: RECORDED_RESULTS_VERSION, records: {} };

const isUsable = (record: StoredJevRecord | undefined): record is StoredJevRecord =>
	record !== undefined &&
	record.status === 'current' &&
	record.rubricVersion === JEV_RUBRIC_VERSION &&
	record.promptVersion === PROMPT_VERSION;

/** The recorded answer for exactly this request, or null when none was recorded. */
export function recordedFor(
	results: RecordedResults,
	request: JevSystemOneRequest
): JevRecord | null {
	const record = results.records[recordKey(request)];
	return isUsable(record) ? { ...record, request, requestDigest: requestDigest(request) } : null;
}

/** The distinct requests that still have no usable recorded answer. */
export function requestsToAsk(
	requests: readonly JevSystemOneRequest[],
	results: RecordedResults
): JevSystemOneRequest[] {
	const missing = new Map<string, JevSystemOneRequest>();
	for (const request of requests) {
		const key = recordKey(request);
		if (!isUsable(results.records[key])) missing.set(key, request);
	}
	return [...missing.values()];
}

/**
 * The results file after a run: exactly the requests the data needs today, each
 * with its usable answer (kept or fresh), in digest order so a rerun with
 * nothing new produces a byte-identical file. Records for requests the data no
 * longer produces are dropped.
 */
export function mergeResults(
	requests: readonly JevSystemOneRequest[],
	previous: RecordedResults,
	fresh: readonly JevRecord[]
): RecordedResults {
	const keyOfDigest = new Map(
		requests.map((request) => [requestDigest(request), recordKey(request)])
	);
	const freshByKey = new Map<string, JevRecord>();
	for (const record of fresh) {
		const key = keyOfDigest.get(record.requestDigest);
		if (key) freshByKey.set(key, record);
	}
	const records: Record<string, StoredJevRecord> = {};
	for (const key of [...new Set(keyOfDigest.values())].sort()) {
		const candidate = freshByKey.get(key) ?? previous.records[key];
		if (isUsable(candidate)) {
			const stored: Partial<JevRecord> = { ...candidate };
			delete stored.request;
			delete stored.requestDigest;
			records[key] = stored as StoredJevRecord;
		}
	}
	return { version: RECORDED_RESULTS_VERSION, records };
}

/** One record per line, so a new answer is a one-line diff and the file stays small. */
export function serializeResults(results: RecordedResults): string {
	const entries = Object.entries(results.records).map(
		([digest, record]) => `\t\t${JSON.stringify(digest)}: ${JSON.stringify(record)}`
	);
	const body = entries.length > 0 ? `{\n${entries.join(',\n')}\n\t}` : '{}';
	return `{\n\t"version": ${JSON.stringify(results.version)},\n\t"records": ${body}\n}\n`;
}
