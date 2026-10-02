// Geometry for the season timeline on the landing page (D-44). Display layer
// only: the record line comes from the checked-in season snapshot, and the
// pins are the storylines' decision dates. Nothing here feeds the engine.
import { storylineRegistry } from '$lib/storylines/registry';
import { SEASON_RECORD } from './split-evidence';

/** Calendar events that frame the season but are not storylines themselves. */
export const SEASON_EVENTS: readonly { date: string; label: string; source: string }[] = [
	{
		date: '2026-04-25',
		label: 'Cora fired at 10–17',
		source: 'Coaching and batting-order changes only; no roster moves followed'
	},
	{ date: '2026-09-21', label: 'Clinched', source: 'NESN, September 22' },
	{
		date: '2026-09-22',
		label: 'Tracy gets the job',
		source:
			'Three-year deal through 2029, interim tag removed; Breslow options picked up (MLB.com, September 22)'
	},
	{
		date: '2026-09-30',
		label: 'Swept out of the Wild Card Series',
		source:
			'Yankees win Game 2 9–2 and the series 2–0, outscoring Boston 18–2 (MLB.com, ESPN, September 30)'
	},
	{
		date: '2026-11-06',
		label: 'Free agency opens',
		source:
			'Qualifying offers and option decisions due five days after the World Series (AP MLB calendar)'
	},
	{
		date: '2026-12-01',
		label: 'CBA expires',
		source: '11:59 p.m. ET; a lockout is widely expected (AP calendar; CBS Sports)'
	},
	{
		date: '2027-03-25',
		label: 'Opening Day 2027',
		source: 'Schedule released July 16, 2026; at risk if a lockout starts (MLB.com)'
	}
];

export const TIMELINE_START = '2026-01-01';
// Traditional Opening Day 2027, from the schedule MLB released on July 16,
// 2026 — a lockout after the CBA expires December 1, 2026 puts that date at
// risk, so the window's end may have to move when the new deal is known.
export const TIMELINE_END = '2027-03-25';

const DAY = 86_400_000;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;

/** 0–1 position of an ISO date between the timeline's ends, clamped. */
export function datePosition(iso: string): number {
	const t = (day(iso) - day(TIMELINE_START)) / (day(TIMELINE_END) - day(TIMELINE_START));
	return Math.min(1, Math.max(0, t));
}

/** Today in the viewer's own timezone, as an ISO date. */
export function todayIso(now: Date = new Date()): string {
	const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

export interface TodayMarker {
	date: string;
	position: number;
	/** False once the season has moved past the timeline's window. */
	inRange: boolean;
}

/**
 * Where today sits on the timeline. A date after the window is clamped to the
 * edge and flagged, so a stale timeline says so instead of pretending the
 * season ended.
 */
export function todayMarker(iso: string = todayIso()): TodayMarker {
	return {
		date: iso,
		position: datePosition(iso),
		inRange: iso >= TIMELINE_START && iso <= TIMELINE_END
	};
}

export interface RecordPoint {
	date: string;
	wins: number;
	losses: number;
	/** Games over .500 after this game. */
	over: number;
}

/** Running record after each game, in date order. */
export function recordSeries(
	record: readonly { date: string; win: boolean }[] = SEASON_RECORD
): RecordPoint[] {
	let wins = 0;
	let losses = 0;
	return record.map((game) => {
		if (game.win) wins += 1;
		else losses += 1;
		return { date: game.date, wins, losses, over: wins - losses };
	});
}

/** The record after the last game on or before `iso`, or null before game one. */
export function recordOn(iso: string, series: readonly RecordPoint[] = recordSeries()) {
	let found: RecordPoint | null = null;
	for (const point of series) {
		if (point.date > iso) break;
		found = point;
	}
	return found;
}

export interface TimelinePin {
	slug: string;
	short: string;
	date: string;
	position: number;
	record: string | null;
}

export function timelinePins(series: readonly RecordPoint[] = recordSeries()): TimelinePin[] {
	return storylineRegistry.map((story) => {
		const point = recordOn(story.eventDate, series);
		return {
			slug: story.slug,
			short: story.short,
			date: story.eventDate,
			position: datePosition(story.eventDate),
			record: point ? `${point.wins}–${point.losses}` : null
		};
	});
}

/** ViewBox units a pin circle must keep from the next one to stay readable. */
export const PIN_CLUSTER_GAP = 26;

/** A pin's true x, paired with its position in the input list. */
interface PlacedPin {
	index: number;
	x: number;
}

/**
 * Where to draw each pin's numbered circle. The pin's vertical date line stays
 * at its true x; the circle may move. Pins sorted by date chain into a group
 * whenever consecutive circles would land closer than `gap` viewBox units, and
 * a group of n is spread evenly around the group's earliest pin: circle i sits
 * at x + (i − (n − 1) / 2) × gap. A pin on its own is a group of one, so its
 * circle stays exactly on its own x. Returns one circle x per input pin, in
 * input order; pair each with a connector back to the pin's true x.
 */
export function pinCircleXs(
	pins: readonly TimelinePin[],
	width: number,
	gap: number = PIN_CLUSTER_GAP
): number[] {
	const placed = pins
		.map((pin, index): PlacedPin => ({ index, x: datePosition(pin.date) * width }))
		.sort((a, b) => a.x - b.x || a.index - b.index);
	const xs = new Array<number>(pins.length);
	let group: { base: number; members: PlacedPin[] } | undefined;
	let previousX = Number.NaN;
	/** Spread one finished group evenly around its earliest pin. */
	const flush = () => {
		if (!group) return;
		const size = group.members.length;
		let rank = 0;
		for (const member of group.members) {
			xs[member.index] = group.base + (rank - (size - 1) / 2) * gap;
			rank += 1;
		}
		group = undefined;
	};
	for (const entry of placed) {
		if (group && entry.x - previousX >= gap) flush();
		if (!group) group = { base: entry.x, members: [] };
		group.members.push(entry);
		previousX = entry.x;
	}
	flush();
	return xs;
}
