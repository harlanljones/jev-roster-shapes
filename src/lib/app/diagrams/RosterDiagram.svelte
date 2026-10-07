<script lang="ts">
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { SOURCE_NAMES, sourcesDisagree, type LabelSource, type SourceLabels } from '../jev-call';
	import { SAVANT_GRADIENT, type BinResult, type Pool, type TrayResult } from '../shape-case';
	import CriteriaLanes from './CriteriaLanes.svelte';
	import WymanBoard from './WymanBoard.svelte';

	// The roster as a primary component (D-57). Packed is the D-50 board, drawn
	// in the rubric's shapes, with the lineup under the pool's best and the
	// tray beside it. By criterion regroups the same pieces into one lane per
	// profile criterion, placed by the chosen source. Either way the selected
	// piece's three labels sit under the diagram.
	let {
		pool,
		bin,
		tray,
		labels,
		thin = new Set<string>(),
		selected,
		onSelect,
		label,
		mode = $bindable('packed'),
		source = $bindable('analyst')
	}: {
		pool: Pool;
		bin: BinResult;
		tray: TrayResult;
		labels: ReadonlyMap<string, SourceLabels>;
		/** Players whose Jev evidence_sufficient answer is under THIN_EVIDENCE_BELOW. */
		thin?: ReadonlySet<string>;
		selected: string | null;
		onSelect: (playerId: string) => void;
		label: string;
		mode?: 'packed' | 'lanes';
		source?: LabelSource;
	} = $props();

	let ringOn = $state(false);
	const hasJev = $derived([...labels.values()].some((l) => l.jev !== null));
	const disagreeing = $derived(
		new Set([...labels].filter(([, l]) => sourcesDisagree(l)).map(([id]) => id))
	);
	const picked = $derived(selected ? labels.get(selected) : undefined);
	const pickedName = $derived(selected ? (pool.get(selected)?.name ?? selected) : '');
	const SOURCES = ['jev', 'rule', 'analyst'] as const;
	const LETTER = { jev: 'J', rule: 'R', analyst: 'A' } as const;
	const NONE = { jev: 'not asked', rule: 'abstained', analyst: 'unlabeled' } as const;
</script>

<section class="roster" aria-label="Roster diagram">
	<header class="head">
		<h2>Roster</h2>
		<div class="toggle" role="group" aria-label="Diagram mode">
			<button type="button" aria-pressed={mode === 'packed'} onclick={() => (mode = 'packed')}
				>Packed</button
			>
			<button type="button" aria-pressed={mode === 'lanes'} onclick={() => (mode = 'lanes')}
				>By criterion</button
			>
		</div>
		{#if mode === 'lanes'}
			<div class="toggle" role="group" aria-label="Place pieces by">
				{#each SOURCES as s (s)}
					<button
						type="button"
						aria-pressed={source === s}
						disabled={s === 'jev' && !hasJev}
						title={s === 'jev' && !hasJev ? 'No Jev answers in this session yet' : undefined}
						onclick={() => (source = s)}>{SOURCE_NAMES[s]}</button
					>
				{/each}
			</div>
		{:else}
			<div class="toggle" role="group" aria-label="Board marks">
				<button type="button" aria-pressed={ringOn} onclick={() => (ringOn = !ringOn)}
					>Mark disagreements</button
				>
			</div>
		{/if}
	</header>

	<div class="body">
		{#if mode === 'packed'}
			<WymanBoard
				{pool}
				{bin}
				{tray}
				{selected}
				{onSelect}
				{label}
				ringed={ringOn ? disagreeing : new Set()}
			/>
		{:else}
			<CriteriaLanes {pool} {labels} {source} {thin} {selected} {onSelect} />
		{/if}

		<p class="legend">
			<span
				><span class="ramp" style:background={SAVANT_GRADIENT}></span> vs LHP | vs RHP OPS against league</span
			>
			<span>Area = 2026 runs</span>
			{#if mode === 'packed'}
				<span>Shapes: rubric v2 (analyst)</span>
				{#if ringOn}<span class="warn"
						>Red ring: Jev, the rule baseline, and the analyst disagree ({disagreeing.size})</span
					>{/if}
			{:else}
				<span>Placed by {SOURCE_NAMES[source]}; letters show where the others put a piece</span>
				{#if thin.size}<span>Hatched: Jev says the evidence is thin</span>{/if}
			{/if}
		</p>

		{#if picked}
			<p class="verdict" aria-label="Labels for {pickedName}">
				<b>{pickedName}</b>
				{#each SOURCES as s (s)}
					{@const value = picked[s]}
					<span class="chip" class:differs={value !== picked.analyst}>
						<span class="mk {LETTER[s]}">{LETTER[s]}</span>
						{#if value}<ShapeGlyph shape={value} size={14} />{/if}
						{SOURCE_NAMES[s]}: {value ?? NONE[s]}
					</span>
				{/each}
			</p>
		{/if}
	</div>
</section>

<style>
	.roster {
		border: 1px solid var(--rule);
		border-radius: 8px;
		background: var(--panel);
		overflow: hidden;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		align-items: center;
		border-bottom: 1px solid var(--rule);
		padding: 0.6rem 0.85rem;
	}
	h2 {
		margin: 0 0.5rem 0 0;
		font-family: var(--display);
		font-size: 1.35rem;
		font-weight: 400;
	}
	.toggle {
		display: inline-flex;
		gap: 3px;
		border: 1px solid var(--rule);
		border-radius: 6px;
		padding: 3px;
	}
	.toggle button {
		min-height: 2.25rem;
		border: 0;
		border-radius: 4px;
		padding: 0 0.7rem;
		color: var(--ink-soft);
		background: transparent;
		font: 600 0.72rem var(--mono);
		cursor: pointer;
	}
	.toggle button[aria-pressed='true'] {
		color: var(--panel);
		background: var(--ink);
	}
	.toggle button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	.body {
		display: grid;
		gap: 0.75rem;
		padding: 0.85rem;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.75rem;
	}
	.ramp {
		display: inline-block;
		width: 5rem;
		height: 8px;
		border-radius: 2px;
		vertical-align: middle;
	}
	.warn {
		color: var(--accent);
	}
	.verdict {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		margin: 0;
		border-top: 1px solid var(--rule);
		padding-top: 0.65rem;
		font-size: 0.82rem;
	}
	.chip {
		display: inline-flex;
		gap: 0.35rem;
		align-items: center;
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 0.2rem 0.6rem 0.2rem 0.2rem;
		font: 500 0.72rem var(--mono);
	}
	.chip.differs {
		border-color: var(--accent);
	}
	.mk {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		color: var(--panel);
		font: 600 0.6rem/18px var(--mono);
		text-align: center;
	}
	.mk.J {
		background: var(--ink);
	}
	.mk.R {
		background: var(--marker);
	}
	.mk.A {
		background: var(--fits);
	}
</style>
