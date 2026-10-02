import { describe, expect, it } from 'vitest';
import {
	PIN_CLUSTER_GAP,
	SEASON_EVENTS,
	TIMELINE_END,
	TIMELINE_START,
	datePosition,
	pinCircleXs,
	todayMarker,
	type TimelinePin
} from '../../src/lib/app/season-timeline';

const pin = (date: string, slug = date): TimelinePin => ({
	slug,
	short: slug,
	date,
	position: datePosition(date),
	record: null
});

/** Distances between neighbouring circles once sorted left to right. */
const gaps = (xs: number[]): number[] => {
	const sorted = [...xs].sort((a, b) => a - b);
	return sorted.slice(1).map((value, i) => value - (sorted[i] ?? Number.NaN));
};

// The axis runs New Year 2026 to Opening Day 2027, so the off-season is part
// of the window instead of the day after it.
describe('timeline window', () => {
	it('runs from January 2026 to Opening Day 2027', () => {
		expect(TIMELINE_START).toBe('2026-01-01');
		expect(TIMELINE_END).toBe('2027-03-25');

		// The day Boston was swept out sits inside the window, not clamped to
		// an axis that had already ended.
		const sweptOut = todayMarker('2026-10-01');
		expect(sweptOut.inRange).toBe(true);
		expect(sweptOut.position).toBeCloseTo(273 / 448, 5);
		expect(todayMarker('2027-03-25').inRange).toBe(true);
		expect(todayMarker('2027-03-26').inRange).toBe(false);
		expect(todayMarker('2027-03-26').position).toBe(1);
	});
});

describe('season events', () => {
	it('frames the off-season with the sourced calendar dates', () => {
		const expected = [
			{ date: '2026-09-22', label: 'Tracy gets the job' },
			{ date: '2026-09-30', label: 'Swept out of the Wild Card Series' },
			{ date: '2026-11-06', label: 'Free agency opens' },
			{ date: '2026-12-01', label: 'CBA expires' },
			{ date: '2027-03-25', label: 'Opening Day 2027' }
		];
		for (const event of expected) {
			expect(SEASON_EVENTS).toContainEqual(expect.objectContaining(event));
		}
	});

	it('cites a source for every event and keeps them on the axis', () => {
		for (const event of SEASON_EVENTS) {
			expect(event.source.length).toBeGreaterThan(0);
			expect(event.date >= TIMELINE_START).toBe(true);
			expect(event.date <= TIMELINE_END).toBe(true);
		}
	});
});

describe('pin circle placement', () => {
	it('spreads a same-week cluster so the numbers never overlap', () => {
		// Four pins inside five days: the Wild Card roster and the three winter
		// decisions the index draws on top of it.
		const cluster = [
			pin('2026-09-27', 'wild-card-roster'),
			pin('2026-10-01', 'winter-infield'),
			pin('2026-10-01', 'winter-duran'),
			pin('2026-10-01', 'winter-bat')
		];
		const xs = pinCircleXs(cluster, 1000);

		expect(xs).toHaveLength(4);
		expect(new Set(xs).size).toBe(4);
		for (const gap of gaps(xs)) {
			expect(gap).toBeCloseTo(PIN_CLUSTER_GAP, 5);
		}
		// The group is spread around its earliest pin, which stays the anchor.
		expect(xs[0] ?? Number.NaN).toBeCloseTo(
			datePosition('2026-09-27') * 1000 - 1.5 * PIN_CLUSTER_GAP,
			5
		);
		// Input order is preserved, so each circle still maps to its own pin.
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
	});

	it('leaves a pin that stands alone exactly on its own date', () => {
		const alone = pinCircleXs([pin('2026-07-22', 'july-run')], 1000);
		expect(alone).toHaveLength(1);
		// Offset zero: no connector, no movement.
		expect(alone[0] ?? Number.NaN).toBe(datePosition('2026-07-22') * 1000);
	});

	it('does not group pins that are far enough apart to read', () => {
		// Twelve days apart on this axis is wider than the cluster gap.
		const apart = pinCircleXs([pin('2026-07-22'), pin('2026-08-03')], 1000);
		expect(apart[0] ?? Number.NaN).toBe(datePosition('2026-07-22') * 1000);
		expect(apart[1] ?? Number.NaN).toBe(datePosition('2026-08-03') * 1000);
	});
});
