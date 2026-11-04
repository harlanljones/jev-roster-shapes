// D-36 and D-63: the public-data acknowledgment is collected before the comparison workspace
// opens. Now that the workspace has its own URL, the acknowledgment is remembered for this
// browser session, keyed by bundle ID, so a direct visit to /compare still meets the gate.
// When session storage is unavailable the gate simply appears every time, which errs safe.

const KEY = 'roster-shapes:acknowledged-public-bundles';

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
	return read().includes(bundleId);
}

export function acknowledgePublic(bundleId: string): void {
	try {
		const ids = read();
		if (!ids.includes(bundleId)) sessionStorage.setItem(KEY, JSON.stringify([...ids, bundleId]));
	} catch {
		// Storage blocked or full: the workspace still opens from this click; a later direct
		// visit shows the gate again.
	}
}
