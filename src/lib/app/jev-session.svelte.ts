// Jev answers for this browser session only, keyed by the exact request
// digest, so a call made on Snapshots shows on the decision board without
// asking again. Nothing here is written to a bundle, a draft, browser storage,
// or the repository, and nothing here can change a calculation (D-47).
import { requestDigest, type JevRecord, type JevSystemOneRequest } from '$lib/classification';

const records = $state<Record<string, JevRecord>>({});

export function rememberJev(record: JevRecord): void {
	records[record.requestDigest] = record;
}

/** The session's record for this exact request, or null when it was never asked. */
export function jevRecordFor(request: JevSystemOneRequest): JevRecord | null {
	return records[requestDigest(request)] ?? null;
}
