<script lang="ts">
	import { RULE_SUMMARIES } from '$lib/classification';
	import { boundingBox, shapePath } from '$lib/shapes/geometry';
	import { SHAPE_LABELS, type ShapeLabel } from '$lib/shapes/taxonomy';
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { SOURCE_NAMES, type LabelSource, type SourceLabels } from '../jev-call';
	import { savantColor, sideOf, type CasePlayer, type Pool, type Side } from '../shape-case';

	// The roster by criterion (D-57): one lane per profile criterion, each
	// piece in the lane its source chose, sized by 2026 runs like the board.
	// A source with no label for a player puts that piece in its own lane
	// ("Abstained" or "Not asked") rather than guessing one.
	let {
		pool,
		labels,
		source,
		thin,
		selected,
		onSelect
	}: {
		pool: Pool;
		labels: ReadonlyMap<string, SourceLabels>;
		source: LabelSource;
		thin: ReadonlySet<string>;
		selected: string | null;
		onSelect: (playerId: string) => void;
	} = $props();

	const uid = $props.id();
	const R_MAX = 24;
	const R_MISSING = 10;
	const NONE = { rule: 'Abstained', jev: 'Not asked', analyst: 'Unlabeled' } as const;
	const LETTER = { jev: 'J', rule: 'R', analyst: 'A' } as const;

	const players = $derived([...pool.values()]);
	const maxRuns = $derived(Math.max(1, ...players.map((p) => p.runs ?? 0)));
	const labelOf = (id: string): ShapeLabel | null => labels.get(id)?.[source] ?? null;

	function piece(p: CasePlayer, shape: ShapeLabel) {
		const missing = p.runs == null;
		const r = missing ? R_MISSING : Math.max(6, R_MAX * Math.sqrt((p.runs ?? 0) / maxRuns));
		const draw = shape === 'Unclassified' ? 'Circle' : shape;
		const box = boundingBox(draw, r);
		const pad = 3;
		const fill = (side: Side) =>
			missing
				? `url(#${uid}-hatch)`
				: p.split
					? savantColor(sideOf(p.split, side).ops, side)
					: 'var(--unknown)';
		const others = (['jev', 'rule', 'analyst'] as const)
			.filter((s) => s !== source)
			.map((s) => ({ letter: LETTER[s], label: labels.get(p.id)?.[s] ?? null }))
			.filter((o) => o.label !== null && o.label !== shape);
		return {
			p,
			d: shapePath(draw, 0, 0, r),
			dashed: missing || shape === 'Unclassified',
			viewBox: `${box.left - pad} ${box.top - pad} ${box.right - box.left + 2 * pad} ${box.bottom - box.top + 2 * pad}`,
			width: box.right - box.left + 2 * pad,
			height: box.bottom - box.top + 2 * pad,
			left: fill('L'),
			right: fill('R'),
			others,
			hatch: thin.has(p.id)
		};
	}

	const lanes = $derived.by(() => {
		const byRuns = (a: CasePlayer, b: CasePlayer) => (b.runs ?? -1) - (a.runs ?? -1);
		const rows: {
			key: string;
			label: string;
			shape: ShapeLabel | null;
			pieces: ReturnType<typeof piece>[];
		}[] = SHAPE_LABELS.map((shape) => ({
			key: shape,
			label: shape,
			shape,
			pieces: players
				.filter((p) => labelOf(p.id) === shape)
				.sort(byRuns)
				.map((p) => piece(p, shape))
		}));
		const none = players.filter((p) => labelOf(p.id) === null).sort(byRuns);
		if (none.length)
			rows.push({
				key: 'none',
				label: NONE[source],
				shape: null,
				pieces: none.map((p) => piece(p, 'Unclassified'))
			});
		return rows;
	});
</script>

<svg width="0" height="0" aria-hidden="true" class="defs">
	<defs>
		<pattern
			id="{uid}-hatch"
			width="6"
			height="6"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(45)"
		>
			<line x1="0" y1="0" x2="0" y2="6" stroke="var(--unknown)" stroke-width="1.5" />
		</pattern>
		<pattern
			id="{uid}-thin"
			width="6"
			height="6"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(45)"
		>
			<line x1="0" y1="0" x2="0" y2="6" stroke="rgba(22,32,42,.55)" stroke-width="1.6" />
		</pattern>
		<clipPath id="{uid}-L"><rect x="-200" y="-200" width="200" height="400" /></clipPath>
		<clipPath id="{uid}-R"><rect x="0" y="-200" width="200" height="400" /></clipPath>
	</defs>
</svg>

<ol class="lanes" aria-label="Roster by profile criterion, placed by {SOURCE_NAMES[source]}">
	{#each lanes as lane (lane.key)}
		<li class="lane" class:empty={!lane.pieces.length}>
			<div class="key">
				{#if lane.shape}<ShapeGlyph shape={lane.shape} size={22} />{:else}<span></span>{/if}
				<span class="name">{lane.label} <span class="count">{lane.pieces.length}</span></span>
				{#if lane.shape}<span class="rule">{RULE_SUMMARIES[lane.shape]}</span>{/if}
			</div>
			<div class="track">
				{#each lane.pieces as pc (pc.p.id)}
					<button
						type="button"
						class="piece"
						class:sel={selected === pc.p.id}
						aria-pressed={selected === pc.p.id}
						aria-label="{pc.p.name}, {lane.label}, {pc.p.runs == null
							? 'runs unavailable'
							: `${pc.p.runs.toFixed(1)} runs`}{pc.others.length
							? `; ${pc.others.map((o) => `${o.letter === 'J' ? 'Jev' : o.letter === 'R' ? 'rule' : 'analyst'} ${o.label}`).join(', ')}`
							: ''}"
						onclick={() => onSelect(pc.p.id)}
					>
						<svg width={pc.width} height={pc.height} viewBox={pc.viewBox} aria-hidden="true">
							<path d={pc.d} fill={pc.left} clip-path="url(#{uid}-L)" />
							<path d={pc.d} fill={pc.right} clip-path="url(#{uid}-R)" />
							{#if pc.hatch}<path d={pc.d} fill="url(#{uid}-thin)" />{/if}
							<path class="outline" d={pc.d} stroke-dasharray={pc.dashed ? '4 3' : undefined} />
						</svg>
						<span class="nm">{pc.p.last}</span>
						{#each pc.others as o (o.letter)}
							<span class="other {o.letter}">{o.letter}:{o.label}</span>
						{/each}
					</button>
				{/each}
				{#if !lane.pieces.length}<span class="nobody">no one</span>{/if}
			</div>
		</li>
	{/each}
</ol>

<style>
	.defs {
		position: absolute;
	}
	.lanes {
		display: grid;
		margin: 0;
		padding: 0;
		border: 1px solid var(--rule);
		border-radius: 6px;
		overflow: hidden;
		list-style: none;
	}
	.lane {
		display: grid;
		grid-template-columns: minmax(8rem, 12.5rem) minmax(0, 1fr);
		min-height: 4.5rem;
		border-top: 1px solid var(--rule);
	}
	.lane:first-child {
		border-top: 0;
	}
	.key {
		display: grid;
		grid-template-columns: 22px minmax(0, 1fr);
		gap: 0.15rem 0.5rem;
		align-content: center;
		border-right: 1px solid var(--rule);
		padding: 0.5rem 0.75rem;
		background: var(--board);
	}
	.name {
		font-family: var(--display);
		font-size: 1rem;
	}
	.count {
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
	}
	.rule {
		grid-column: 2;
		color: var(--marker);
		font: 500 0.66rem/1.35 var(--mono);
	}
	.track {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.75rem;
		align-items: center;
		padding: 0.4rem 0.6rem;
		background: var(--panel);
	}
	.piece {
		display: inline-flex;
		flex-wrap: wrap;
		max-width: 100%;
		gap: 0.3rem;
		align-items: center;
		min-height: 2.75rem;
		border: 1px solid transparent;
		border-radius: 6px;
		padding: 0.15rem 0.35rem;
		color: var(--ink);
		background: transparent;
		font: inherit;
		cursor: pointer;
	}
	.piece:hover {
		border-color: var(--rule);
	}
	.piece.sel {
		border-color: var(--ink);
	}
	.outline {
		fill: none;
		stroke: rgba(0, 0, 0, 0.45);
		stroke-width: 1;
	}
	.piece.sel .outline {
		stroke: var(--ink);
		stroke-width: 2.5;
	}
	.nm {
		font-size: 0.78rem;
		font-weight: 600;
	}
	.other {
		font: 600 0.62rem var(--mono);
	}
	.other.J {
		color: var(--ink);
	}
	.other.R {
		color: var(--marker);
	}
	.other.A {
		color: var(--fits);
	}
	.nobody {
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
	}
</style>
