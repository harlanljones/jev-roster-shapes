import { describe, expect, it } from 'vitest';
import {
	SEASON_END,
	SEASON_START,
	rosterPlan,
	seasonAsOf,
	shouldWrite,
	windowPlan
} from '../../spikes/mlb-2026/lib/timeline-plan.mjs';

describe('timeline-plan seasonAsOf (D-54)', () => {
	it('clamps to SEASON_END once the snapshot day passes the regular-season close', () => {
		expect(seasonAsOf('2026-10-05')).toBe('2026-09-27');
	});

	it('follows the snapshot day while the season is running', () => {
		expect(seasonAsOf('2026-07-10')).toBe('2026-07-10');
	});

	it('returns SEASON_END unchanged on the boundary day', () => {
		expect(seasonAsOf(SEASON_END)).toBe(SEASON_END);
	});
});

describe('timeline-plan windowPlan (D-54)', () => {
	it('fetches only the fixed decision windows once the season is over', () => {
		const windows = windowPlan('2026-10-05');
		expect(Object.keys(windows)).toEqual([
			'season-2025',
			'through-2026-06-30',
			'through-2026-08-02',
			'through-2026-09-27'
		]);
	});

	it('adds the snapshot-day window while the season is running', () => {
		const windows = windowPlan('2026-07-10');
		expect(windows['through-2026-07-10']).toEqual({ start: SEASON_START, end: '2026-07-10' });
		// D-52 froze the pins; the unread "afterward" windows stay out of the fetch.
		expect(Object.keys(windows).filter((key) => key.startsWith('from-'))).toEqual([]);
	});

	it('does not duplicate the moving window when the snapshot day is SEASON_END', () => {
		const windows = windowPlan(SEASON_END);
		expect(Object.keys(windows)).toEqual([
			'season-2025',
			'through-2026-06-30',
			'through-2026-08-02',
			'through-2026-09-27'
		]);
	});
});

describe('timeline-plan rosterPlan (D-54)', () => {
	it('fetches only the fixed decision dates, never the snapshot day', () => {
		expect(rosterPlan()).toEqual(['2026-03-25', '2026-06-30', '2026-08-02', '2026-09-27']);
	});
});

describe('timeline-plan shouldWrite (D-54)', () => {
	const content = {
		source: 'statsapi',
		team: 111,
		season: 2026,
		windows: { 'through-2026-09-27': { start: '2026-03-01', end: '2026-09-27' } },
		games: [{ date: '2026-03-26', win: true, runs: 5, oppRuns: 3 }],
		rosters: { '2026-09-27': { active: [665742], fortyMan: [665742] } },
		people: { 665742: { name: 'Jarren Duran', oppStarterId: 657593 } },
		hitting: { 665742: { 'through-2026-09-27': [{ team: null, pa: 639, runs: 85 }] } },
		fielding: {},
		splits: { 665742: [{ code: 'vr', team: 111, pa: 300, ops: 0.834 }] }
	};

	const existing = {
		asOf: '2026-10-05',
		fetchedAt: '2026-10-05T16:08:14Z',
		...content
	};

	it('skips a metadata-only refetch: same content, new fetchedAt/asOf', () => {
		expect(shouldWrite(existing, content)).toBe(false);
	});

	it('writes when a consumed rate row changes', () => {
		const moved = {
			...content,
			hitting: { 665742: { 'through-2026-09-27': [{ team: null, pa: 640, runs: 85 }] } }
		};
		expect(shouldWrite(existing, moved)).toBe(true);
	});

	it('writes when the checked-in snapshot still carries sections the plan no longer fetches', () => {
		const stale = {
			...existing,
			windows: {
				...content.windows,
				'from-2026-08-03': { start: '2026-08-03', end: '2026-10-05' }
			}
		};
		expect(shouldWrite(stale, content)).toBe(true);
	});

	it('is insensitive to key order between runs', () => {
		const reordered = {
			splits: content.splits,
			fielding: content.fielding,
			hitting: content.hitting,
			people: content.people,
			rosters: content.rosters,
			games: content.games,
			windows: content.windows,
			season: content.season,
			team: content.team,
			source: content.source
		};
		expect(shouldWrite(existing, reordered)).toBe(false);
	});

	it('writes when no snapshot is checked in yet', () => {
		expect(shouldWrite(null, content)).toBe(true);
	});
});
