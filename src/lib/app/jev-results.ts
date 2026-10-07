// The Jev answers CI recorded for the checked-in snapshots (D-58). The app only
// reads them: nothing here calls the provider or can change a calculation.
import {
	recordedFor,
	type JevRecord,
	type JevSystemOneRequest,
	type RecordedResults
} from '$lib/classification';
import results from '$lib/classification/jev-results.json';

const recorded = results as unknown as RecordedResults;

/** The recorded answer for this exact request, or null when CI has not asked it. */
export function jevRecordFor(request: JevSystemOneRequest): JevRecord | null {
	return recordedFor(recorded, request);
}

export const recordedCount = Object.keys(recorded.records).length;
