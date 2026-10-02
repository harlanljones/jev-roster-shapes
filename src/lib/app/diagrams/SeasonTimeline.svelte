<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		SEASON_EVENTS,
		TIMELINE_END,
		datePosition,
		pinCircleXs,
		recordSeries,
		timelinePins,
		todayMarker
	} from '../season-timeline';

	// The season as a line of games over .500, with each storyline pinned to
	// the date its decision was made (D-44) and today marked on the same axis
	// (D-46). The pins are links; the SVG is a labeled picture of the same list,
	// so the list is the text equivalent.
	let { activeSlug, today }: { activeSlug?: string; today?: string } = $props();

	const W = 1000;
	const H = 170;
	const top = 34;
	const bottom = 138;
	const series = recordSeries();
	const last = series.at(-1);
	const span = Math.max(4, ...series.map((p) => Math.abs(p.over)));
	const y = (over: number) => top + ((span - over) / (2 * span)) * (bottom - top);
	const x = (iso: string) => datePosition(iso) * W;
	const path = series.length
		? `M${x('2026-03-25').toFixed(1)},${y(0).toFixed(1)} ` +
			series.map((p) => `L${x(p.date).toFixed(1)},${y(p.over).toFixed(1)}`).join(' ')
		: '';
	// January 2026 → March 2027, the whole window. The key is the YYYY-MM
	// because the short labels repeat once the axis crosses into 2027 and
	// Svelte's each keys must be unique; the label itself is unchanged.
	const months = Array.from({ length: 15 }, (_, i) => {
		const date = new Date(Date.UTC(2026, i, 1));
		const iso = date.toISOString().slice(0, 10);
		return {
			key: iso.slice(0, 7),
			x: x(iso),
			label: date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
		};
	});
	const pins = timelinePins(series).sort((a, b) => a.date.localeCompare(b.date));
	// Pins within days of each other would stack their circles on top of one
	// another, so only the circle moves inside a cluster; the date line stays
	// on the pin's true date and a connector joins the two.
	const circles = pinCircleXs(pins, W);
	const drawn = pins.map((pin, i) => ({
		pin,
		num: i + 1,
		lineX: x(pin.date),
		circleX: circles[i] ?? x(pin.date)
	}));
	const marker = $derived(todayMarker(today));
	const href = (slug: string) => resolve('/scenario/[slug]', { slug });
	const longDate = (iso: string) =>
		new Date(`${iso}T00:00:00Z`).toLocaleString('en-US', {
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		});
	const todayRecord = $derived.by(() => {
		let found: (typeof series)[number] | null = null;
		for (const point of series) {
			if (point.date > marker.date) break;
			found = point;
		}
		return found;
	});
	const summary = $derived(
		[
			`Boston's 2026 record by date, ${last ? `${last.wins}–${last.losses} through ${longDate(last.date)}` : 'unavailable'}`,
			`with ${pins.length} storyline dates marked`,
			`and today, ${longDate(marker.date)}, ${
				todayRecord ? `${todayRecord.wins}–${todayRecord.losses}` : 'before the first game'
			}`,
			marker.inRange ? '' : 'past the end of this timeline window'
		]
			.filter(Boolean)
			.join(', ')
	);
</script>

<nav class="timeline" aria-label="Season timeline">
	<svg viewBox="0 0 {W} {H}" role="img" aria-label={summary}>
		<rect
			class="preseason"
			x="0"
			y={top - 8}
			width={x('2026-03-26')}
			height={bottom - top + 16}
			role="img"
			aria-label="Spring training, March 26 to April 8"
		/>
		<rect
			class="preseason"
			x={x('2026-09-28')}
			y={top - 8}
			width={x(TIMELINE_END) - x('2026-09-28')}
			height={bottom - top + 16}
			role="img"
			aria-label="Off season, September 28, 2026 to March 25, 2027"
		/>
		{#each months as m (m.key)}
			<line class="month" x1={m.x} x2={m.x} y1={top - 8} y2={bottom + 8} />
			<text class="month-label" x={m.x + 4} y={H - 8}>{m.label}</text>
		{/each}
		<line class="zero" x1="0" x2={x(TIMELINE_END)} y1={y(0)} y2={y(0)} />
		<text class="axis-label" x="4" y={y(0) - 4}>.500</text>
		{#each SEASON_EVENTS as e (e.date)}
			<line class="event" x1={x(e.date)} x2={x(e.date)} y1={top - 8} y2={bottom + 8}>
				<title>{e.label}: {e.source}</title>
			</line>
		{/each}
		<path class="record" d={path} />
		{#each drawn as item (item.pin.slug)}
			<g class="pin" class:active={item.pin.slug === activeSlug}>
				<line x1={item.lineX} x2={item.lineX} y1="18" y2={bottom + 8} />
				{#if item.circleX !== item.lineX}
					<line x1={item.lineX} x2={item.circleX} y1="27" y2="27" />
				{/if}
				<circle cx={item.circleX} cy="14" r="11" />
				<text x={item.circleX} y="18.5">{item.num}</text>
			</g>
		{/each}
		<!-- Drawn last: extending the window put today inside the busiest week
		     of the axis, and the pin circles would otherwise bury its label. -->
		<g class="today">
			<line x1={x(marker.date)} x2={x(marker.date)} y1="6" y2={bottom + 8} />
			<text x={Math.min(x(marker.date) + 5, W - 96)} y="12">today</text>
			<title>
				Today is {longDate(marker.date)}{todayRecord
					? `; Boston is ${todayRecord.wins}–${todayRecord.losses}`
					: ', before the first game'}
			</title>
		</g>
	</svg>
	<ol class="pins">
		{#each pins as pin, i (pin.slug)}
			<li>
				<a
					class="pin-link"
					href={href(pin.slug)}
					aria-current={pin.slug === activeSlug ? 'page' : undefined}
				>
					<span class="num" aria-hidden="true">{i + 1}</span>
					<span class="name">{pin.short}</span>
					<small>{longDate(pin.date)}{pin.record ? ` · ${pin.record}` : ' · preseason'}</small>
				</a>
			</li>
		{/each}
	</ol>
	<p class="today-note">
		Today is <b>{longDate(marker.date)}</b>{todayRecord
			? ` · Boston ${todayRecord.wins}–${todayRecord.losses} on the timeline`
			: ' · before the first game of the season'}{marker.inRange
			? ''
			: ' · outside the January 2026 to March 2027 window this timeline covers'}
	</p>
	<p class="events">
		{#each SEASON_EVENTS as e, i (e.date)}{i ? ' · ' : ''}<span>{longDate(e.date)}: {e.label}</span
			>{/each}
	</p>
</nav>

<style>
	.timeline {
		display: grid;
		gap: 0.75rem;
		border: 1px solid var(--rule);
		background: var(--panel);
		padding: 1rem;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.preseason {
		fill: var(--chip-bg);
	}
	.month {
		stroke: var(--rule);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.month-label,
	.axis-label {
		fill: var(--ink-soft);
		font: 500 11px var(--mono);
	}
	.zero {
		stroke: var(--rule-strong);
		stroke-dasharray: 4 4;
		vector-effect: non-scaling-stroke;
	}
	.event {
		stroke: var(--ink-soft);
		stroke-dasharray: 2 3;
		vector-effect: non-scaling-stroke;
	}
	.record {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
	.pin line {
		stroke: var(--accent);
		stroke-width: 1.5;
		vector-effect: non-scaling-stroke;
	}
	.pin circle {
		fill: var(--panel);
		stroke: var(--accent);
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
	}
	.pin text {
		fill: var(--accent-dark);
		font: 600 12px var(--mono);
		text-anchor: middle;
	}
	.pin.active circle {
		fill: var(--accent);
	}
	.pin.active text {
		fill: var(--panel);
	}
	.today line {
		stroke: var(--marker);
		stroke-width: 1.5;
		stroke-dasharray: 5 3;
		vector-effect: non-scaling-stroke;
	}
	.today text {
		fill: var(--marker);
		font: 600 11px var(--mono);
		letter-spacing: 0.04em;
	}
	.today-note {
		margin: 0;
		color: var(--ink-soft);
		font: 400 0.78rem var(--mono);
	}
	.today-note b {
		color: var(--marker);
		font-weight: 600;
	}
	.pins {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.pin-link {
		display: grid;
		grid-template-columns: auto 1fr;
		column-gap: 0.5rem;
		align-items: center;
		min-height: 2.75rem;
		border: 1px solid var(--rule);
		padding: 0.35rem 0.75rem;
		color: var(--ink);
		background: var(--panel);
		text-decoration: none;
	}
	.pin-link .num {
		grid-row: span 2;
		font: 600 0.85rem var(--mono);
		color: var(--accent-dark);
	}
	.pin-link .name {
		font-weight: 600;
	}
	.pin-link small {
		color: var(--ink-soft);
		font: 400 0.75rem var(--mono);
	}
	.pin-link[aria-current='page'] {
		border-color: var(--ink);
		color: var(--panel);
		background: var(--ink);
	}
	.pin-link[aria-current='page'] small,
	.pin-link[aria-current='page'] .num {
		color: var(--panel);
	}
	.events {
		margin: 0;
		color: var(--ink-soft);
		font: 400 0.75rem var(--mono);
	}
</style>
