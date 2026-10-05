// Shared planning facts for the 2026 timeline snapshot pipeline (D-54).
// The fetcher and the builder must agree on the regular-season close so the
// dated pins, the fetch windows, and the season display cannot drift apart.
// Dated pins stay frozen across refreshes (D-52); the season display clamps
// here instead of chasing the snapshot day past the last regular-season game.
export const SEASON_START = '2026-03-01';
export const SEASON_END = '2026-09-27';

/**
 * A fetch window: either an MLB `season` query or a regular-season-only
 * `byDateRange` query (the fetcher adds `gameType=R`; see D-52).
 *
 * @typedef {{ stats: 'season', season: number } | { start: string, end: string }} SnapshotWindow
 */

/**
 * Every dated pin keeps its own decision window across refreshes, so a later
 * DATA_AS_OF can never drop or rewrite one (D-52). `season-2025` carries the
 * two preseason pins' rate basis.
 *
 * @type {{ [key: string]: SnapshotWindow }}
 */
export const FIXED_WINDOWS = {
	'season-2025': { stats: 'season', season: 2025 },
	'through-2026-06-30': { start: SEASON_START, end: '2026-06-30' },
	'through-2026-08-02': { start: SEASON_START, end: '2026-08-02' },
	'through-2026-09-27': { start: SEASON_START, end: SEASON_END }
};

/**
 * The fetch windows for a snapshot day. While the season is running the
 * snapshot day needs its own season-to-date window for the display layer;
 * once the snapshot day passes SEASON_END nothing can read a moving window
 * (the season display clamps to SEASON_END), so only the fixed windows are
 * fetched and the snapshot stops growing (D-54).
 *
 * @param {string} endDate - UTC snapshot day (YYYY-MM-DD).
 * @returns {{ [key: string]: SnapshotWindow }}
 */
export function windowPlan(endDate) {
	const windows = { ...FIXED_WINDOWS };
	if (endDate > SEASON_END || Object.hasOwn(FIXED_WINDOWS, `through-${endDate}`)) {
		return windows;
	}
	windows[`through-${endDate}`] = { start: SEASON_START, end: endDate };
	return windows;
}

/**
 * Roster dates: only the decision dates the pins actually read
 * (`timeline-build.mjs` reads `snapshot.rosters[story.asOf]`). The snapshot
 * day itself is never a read date anymore, so it is not fetched (D-54).
 *
 * @returns {string[]}
 */
export function rosterPlan() {
	return ['2026-03-25', '2026-06-30', '2026-08-02', '2026-09-27'];
}

/**
 * The season display's as-of label: the snapshot day while the season is
 * running, the regular-season close once October games can no longer add to
 * a regular-season rate. ISO dates compare correctly as strings.
 *
 * @param {string} snapshotAsOf - The snapshot's as-of date (YYYY-MM-DD).
 * @returns {string}
 */
export function seasonAsOf(snapshotAsOf) {
	return snapshotAsOf < SEASON_END ? snapshotAsOf : SEASON_END;
}

/**
 * Key-order-stable form of a parsed JSON value, for comparing two snapshots
 * that were built by the same fetcher but possibly ordered differently.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function canonical(value) {
	if (Array.isArray(value)) return value.map(canonical);
	if (value !== null && typeof value === 'object') {
		const source = /** @type {{ [key: string]: unknown }} */ (value);
		return Object.fromEntries(
			Object.keys(source)
				.sort()
				.map((key) => [key, canonical(source[key])])
		);
	}
	return value;
}

/**
 * @param {Record<string, unknown>} snapshot
 * @returns {Record<string, unknown>}
 */
function withoutMeta(snapshot) {
	const content = { ...snapshot };
	delete content.asOf;
	delete content.fetchedAt;
	return content;
}

/**
 * Materiality rule (D-54): a refetch writes the snapshot only when consumed
 * content — the record line, the fetch windows, dated rosters, people,
 * hitting/fielding rows, or splits — differs from the checked-in file. A
 * metadata-only refetch (fresh fetchedAt/asOf over identical content) writes
 * nothing, so the bundles, their pinned digests, and season.json stay
 * byte-identical and the daily workflow produces no pull request.
 *
 * @param {Record<string, unknown> | null} existing - Parsed checked-in snapshot, or null when none exists.
 * @param {Record<string, unknown>} incoming - The freshly computed content (no asOf/fetchedAt).
 * @returns {boolean}
 */
export function shouldWrite(existing, incoming) {
	if (!existing) return true;
	return JSON.stringify(canonical(withoutMeta(existing))) !== JSON.stringify(canonical(incoming));
}
