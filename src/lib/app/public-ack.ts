// D-36 and D-63: the public-data acknowledgment is collected before the comparison workspace
// opens. Now that the workspace has its own URL, the acknowledgment is remembered for this
// browser session, keyed by bundle ID, so a direct visit to /compare still meets the gate.
// When session storage is unavailable the acknowledgment is kept in memory for this page load,
// so the click that opens the workspace is not asked for twice; a reload asks again, which errs
// safe.

const KEY = 'roster-shapes:acknowledged-public-bundles';
const memory = new Set<string>();

function read(): string[] {
	try {
		const raw = sessionStorage.getItem(KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
}

export function hasAcknowledgedPublic(bundleId: string): boolean {
	return memory.has(bundleId) || read().includes(bundleId);
}

export function acknowledgePublic(bundleId: string): void {
	memory.add(bundleId);
	try {
		const ids = read();
		if (!ids.includes(bundleId)) sessionStorage.setItem(KEY, JSON.stringify([...ids, bundleId]));
	} catch {
		// Storage blocked or full: the in-memory record still carries this click to /compare.
	}
}
