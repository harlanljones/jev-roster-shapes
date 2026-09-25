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
	{ date: '2026-09-21', label: 'Clinched', source: 'NESN, September 22' }
];

export const TIMELINE_START = '2026-01-01';
export const TIMELINE_END = '2026-10-01';

const DAY = 86_400_000;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;

/** 0–1 position of an ISO date between the timeline's ends, clamped. */
export function datePosition(iso: string): number {
	const t = (day(iso) - day(TIMELINE_START)) / (day(TIMELINE_END) - day(TIMELINE_START));
	return Math.min(1, Math.max(0, t));
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
