<script lang="ts">
	import { resolve } from '$app/paths';
	import { scenarioQuery } from './routes';
	import { page } from '$app/state';
	import { calculateComparison, calculatePoolFit, poolFitFor } from '$lib/engine';
	import type { Storyline } from '$lib/storylines/registry';
	import { TESTED_SCENARIOS } from './case-stories';
	import DecisionNav from './DecisionNav.svelte';
	import ScenarioPicker from './ScenarioPicker.svelte';
	import { DIAGRAMS, pickScenario, type DiagramKey } from './decision';
	import CapacityBin from './diagrams/CapacityBin.svelte';
	import CaseKey from './diagrams/CaseKey.svelte';
	import CaseTable from './diagrams/CaseTable.svelte';
	import EngineFit from './diagrams/EngineFit.svelte';
	import Findings from './diagrams/Findings.svelte';
	import InteractionMap from './diagrams/InteractionMap.svelte';
	import PieceDetail from './diagrams/PieceDetail.svelte';
	import ShapeCase from './diagrams/ShapeCase.svelte';
	import SlotBars from './diagrams/SlotBars.svelte';
	import {
		barFill,
		barFindings,
		buildPool,
		caseView,
		interactionEdges,
		interactionFindings,
		lineupBin,
		lineupIds,
		locksOf,
		scenarioLineup,
		tightestBin,
		tightestFit
	} from './shape-case';
	import { SPLIT_SOURCE } from './split-evidence';

	// D-50: the supplementary diagrams behind a decision's board. Each subpage
	// reads the board's scenario pick from the query, so the case, the engine's
	// pool fit, the interaction map, and the slot bars all describe the
	// scenario the board is showing.
	let { story, diagram }: { story: Storyline; diagram: DiagramKey } = $props();

	let selectedId = $state<string | null>(null);

	const meta = $derived(DIAGRAMS.find((d) => d.key === diagram)!);
	const bundle = $derived(story.bundle);
	const scenario = $derived(pickScenario(bundle, page.url.searchParams.get('scenario')));
	const isBaseline = $derived(scenario.id === bundle.comparison.baseline.id);
	const pool = $derived(buildPool(bundle));
	const locks = $derived(locksOf(scenario));
	const baseLineup = $derived(scenarioLineup(bundle, bundle.comparison.baseline));
	const lineup = $derived(scenarioLineup(bundle, scenario));
	const view = $derived(caseView(pool, lineup, baseLineup));
	const selected = $derived(
		selectedId && pool.has(selectedId) ? selectedId : (lineup['3B'] ?? lineupIds(lineup)[0] ?? null)
	);
	const nameOf = (playerId: string) => pool.get(playerId)?.name ?? playerId;
	const runs = (v: number | null) => (v == null ? 'runs unavailable' : `${v.toFixed(1)} runs`);
	/** Engine totals are exact decimal strings, so they are not pre-rounded. */
	const engineDelta = (v: string | null) =>
		v == null
			? 'Δ unavailable'
			: `Δ ${Number(v) >= 0 ? '+' : '−'}${Math.abs(Number(v)).toFixed(3)}`;
	const binStats = (b: { fill: number; gaps: number; headroom: number }) =>
		`${Math.round(b.fill)}% board fill · ${Math.round(b.gaps)}% gaps · ${Math.round(b.headroom)}% headroom`;
	/** Findings text is written in the engine layer; name its measure here so it can't read as board fill. */
	const slotBandWords = (t: string) =>
		t
			.replace(/fills (\d+)% of the container/, 'has a slot-band fill of $1%')
			.replace(/^The tightest fit fills (\d+)%,/, 'The tightest fit has a slot-band fill of $1%,');
	const findingsFor = (items: { lead: string; text: string }[] | undefined) =>
		(items ?? []).map((i) => ({ ...i, lead: slotBandWords(i.lead) }));
	const longDate = (iso: string) =>
		new Date(`${iso}T00:00:00Z`).toLocaleString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});

	// Each diagram's inputs, computed only on the subpage that draws it.
	const pinned = $derived(
		diagram === 'case'
			? (calculateComparison(bundle).results.find((r) => r.scenarioId === scenario.id)?.offense
					.runs ?? null)
			: null
	);
	const analysis = $derived(diagram === 'engine' ? calculatePoolFit(bundle) : null);
	const engineFit = $derived(analysis ? poolFitFor(analysis, scenario.id) : null);
	const edges = $derived(
		diagram === 'interactions'
			? interactionEdges(
					pool,
					TESTED_SCENARIOS.filter((t) => t.story === story.slug)
				)
			: []
	);
	const netFind = $derived(diagram === 'interactions' ? interactionFindings(pool, edges) : []);
	const slots = $derived.by(() => {
		if (diagram !== 'slots') return null;
		const fit = tightestFit(pool, locks);
		const cur = barFill(pool, lineup, lineup);
		const best = barFill(pool, fit.L, fit.R);
		return {
			curBin: lineupBin(pool, lineup, locks),
			bestBin: tightestBin(pool, locks),
			cur,
			best,
			px: 800 / Math.max(cur.pa, best.pa),
			find: barFindings(pool, cur, best, locks).map((g) => findingsFor(g) as typeof g)
		};
	});
</script>

<svelte:head>
	<title>{meta.title} · {story.title} · Roster Shapes</title>
</svelte:head>

<div class="subpage">
	<header class="head">
		<a
			class="back"
			href="{resolve('/decisions/[slug]', { slug: story.slug })}{scenarioQuery(
				isBaseline ? null : scenario.id
			)}">← Board: {story.title}</a
		>
		<h1 class="page-title">{meta.title}</h1>
		<p class="lede">{meta.blurb}</p>
		<DecisionNav slug={story.slug} current={diagram} scenarioId={isBaseline ? null : scenario.id} />
		<ScenarioPicker {bundle} {pool} current={scenario} />
	</header>

	{#if diagram === 'case'}
		<section class="split" aria-labelledby="case-title">
			<div class="main">
				<h2 id="case-title" class="visually-hidden">The case for {scenario.label}</h2>
				<ShapeCase
					{pool}
					{view}
					{selected}
					onSelect={(id: string) => (selectedId = id)}
					label="Roster case for {scenario.label}: nine position cutouts and a bench tray"
				/>
				<p class="stamp">
					<span>Case total <b>{runs(view.runs)}</b> actual 2026 (display layer)</span>
					<span
						>Pinned 10-game engine total <b>{pinned ?? 'unavailable'}</b> runs (the workspace number)</span
					>
				</p>
				<Findings
					groups={[
						{
							title: 'Empty space',
							tone: 'empty',
							items: view.findings.empty,
							none: 'None found.'
						},
						{ title: 'Nice fits', tone: 'nice', items: view.findings.nice, none: 'No snug fits.' },
						{
							title: 'Friction',
							tone: 'friction',
							items: view.findings.friction,
							none: 'Every lineup piece is snug.'
						}
					]}
				/>
				<details class="table-toggle">
					<summary>The case as a table</summary>
					<CaseTable {pool} {view} {pinned} />
				</details>
			</div>
			<aside class="side" aria-label="Selected piece">
				{#if selected}
					<PieceDetail {pool} playerId={selected} role={view.roleOf.get(selected)} />
				{/if}
				<CaseKey />
			</aside>
		</section>
	{:else if diagram === 'engine' && analysis}
		<section class="block" aria-labelledby="engine-title">
			<h2 id="engine-title">What the roster could have done instead</h2>
			<p class="lede">
				The engine searches each scenario's own roster for the best nine it can field, one lineup
				per pitcher hand context, and judges that lineup with the same feasibility, coverage, and
				capacity rules as any other scenario. Everything here is dated evidence: rates known on {longDate(
					story.eventDate
				)}, not hindsight, so it can disagree with the board.
			</p>
			<div class="table-scroll">
				<table class="fit-comparison">
					<caption>
						Pool fit against the lineup each scenario used, over the same illustrative ten game
						horizon
					</caption>
					<thead>
						<tr>
							<th scope="col">Scenario</th>
							<th scope="col">Lineup used</th>
							<th scope="col">Pool's best nine</th>
							<th scope="col">Left on the table</th>
							<th scope="col">Best fit overall</th>
						</tr>
					</thead>
					<tbody>
						{#each analysis.fits as row (row.scenarioId)}
							<tr>
								<th scope="row">{row.label}</th>
								<td
									>{analysis.references.find((r) => r.scenarioId === row.scenarioId)?.runs ??
										'unavailable'}</td
								>
								<td>{row.runs ?? 'unavailable'}</td>
								<td>{engineDelta(row.deltaVsReference?.runs ?? null)}</td>
								<td
									>{analysis.best?.scenarioId === row.scenarioId
										? 'highest available fit'
										: '—'}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if engineFit}
				<EngineFit fit={engineFit} {nameOf} label="Pool fit for {scenario.label}" />
			{/if}
		</section>
	{:else if diagram === 'interactions'}
		<section class="tray" aria-labelledby="map-title">
			<div class="main">
				<h2 id="map-title">The same pieces off the field</h2>
				<p class="lede">
					Solid gray lines share a position, solid green arrows are the swaps this storyline tests
					(thick in this scenario) with the change in actual 2026 runs, dotted lines pair players
					whose real splits complement, and dashed lines lead into the DH lane.
				</p>
				<InteractionMap
					{pool}
					{edges}
					roleOf={view.roleOf}
					lineupIds={lineupIds(lineup)}
					dh={lineup.DH ?? null}
					activeTest={{ story: story.slug, scenarioId: scenario.id }}
					{selected}
					onSelect={(id: string) => (selectedId = id)}
				/>
			</div>
			<Findings
				columns={false}
				groups={[
					{
						title: 'Pieces with no neighbor',
						tone: 'empty',
						items: netFind[0] ?? [],
						none: 'None.'
					},
					{ title: 'Crowded clusters', tone: 'friction', items: netFind[1] ?? [], none: 'None.' },
					{ title: 'Chain reactions', tone: 'nice', items: netFind[2] ?? [], none: 'None.' }
				]}
			/>
		</section>
	{:else if diagram === 'slots' && slots}
		<section class="tray" aria-labelledby="bins-title">
			<div class="main">
				<h2 id="bins-title">This lineup against the hindsight best nine</h2>
				<p class="lede">
					The board's lid is where the hindsight best nine tops out. Here it is packed beside this
					lineup, using the platoons and position moves the pool allows.
				</p>
				<p class="measure">
					<b>Board fill</b> is the share of the lid covered by the packed shapes; gaps are space lost
					where outlines don't nest and headroom is value left off. It is not the slot band fill measured
					below.
				</p>
				<div class="bins">
					<figure>
						<figcaption>
							<h3>This lineup</h3>
							<span>{binStats(slots.curBin)} · {runs(slots.curBin.runs)}</span>
						</figcaption>
						<CapacityBin
							{pool}
							bin={slots.curBin}
							label="{scenario.label} packed into the bin: {binStats(slots.curBin)}"
						/>
					</figure>
					<figure>
						<figcaption>
							<h3>Hindsight best nine, platoons and position moves</h3>
							<span>{binStats(slots.bestBin)} · {runs(slots.bestBin.runs)}</span>
						</figcaption>
						<CapacityBin
							{pool}
							bin={slots.bestBin}
							label="The hindsight best nine packed into the bin: {binStats(slots.bestBin)}"
						/>
					</figure>
				</div>
				<h2 id="bars-title">Slot by slot</h2>
				<p class="lede">
					Each column is as wide as the occupant's actual PA and splits at his real share against
					each hand; a band fills with estimated runs per PA against that hand, and full is .150.
					Dotted lines mark the 2026 league average.
				</p>
				<p class="measure">
					<b>Slot band fill</b> is the share of all nine columns' bands filled by those runs. It differs
					from the board fill above, which measures how the shapes pack.
				</p>
				<h3>This lineup · {Math.round(slots.cur.pct)}% slot band fill</h3>
				<SlotBars
					{pool}
					bars={slots.cur}
					px={slots.px}
					label="{scenario.label} slot by slot: {Math.round(slots.cur.pct)}% slot-band fill"
				/>
				<h3>Hindsight best nine · {Math.round(slots.best.pct)}% slot band fill</h3>
				<SlotBars
					{pool}
					bars={slots.best}
					px={slots.px}
					label="The hindsight best nine slot by slot: {Math.round(slots.best.pct)}% slot-band fill"
				/>
			</div>
			<Findings
				columns={false}
				groups={[
					{
						title: 'Where the empty space is',
						tone: 'empty',
						items: slots.find[0] ?? [],
						none: 'None.'
					},
					{
						title: 'Tightest fit this pool allows',
						tone: 'nice',
						items: slots.find[1] ?? [],
						none: 'None.'
					},
					{
						title: "Pieces that don't fit",
						tone: 'friction',
						items: slots.find[2] ?? [],
						none: 'None.'
					}
				]}
			/>
		</section>
	{/if}

	<footer class="sources">
		Splits and PA come from {SPLIT_SOURCE.label}, fetched {SPLIT_SOURCE.fetchedAt}. Shapes follow
		rubric v2, where a Star is a tough fit rather than a star player. Diagrams sized by actual 2026
		production are a display layer; the engine's pool fit uses the bundle's dated metric only.
	</footer>
</div>

<style>
	.measure {
		margin: 0 0 var(--spacing-100);
		max-width: 60ch;
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.subpage {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--spacing-500);
		max-width: 88rem;
		margin: 0 auto;
		padding: var(--spacing-300) var(--spacing-300) var(--spacing-700);
	}
	.head,
	.main,
	.side,
	.block {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--spacing-200);
		align-content: start;
	}
	.back {
		display: inline-block;
		padding-block: var(--spacing-75);
		color: var(--turf);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
		text-decoration: none;
	}
	.back:hover {
		text-decoration: underline;
	}
	h1 {
		margin: 0;
	}
	h2 {
		margin: 0;
		font-family: var(--font-sans);
		font-size: var(--text-3xl);
		line-height: var(--text-3xl--lh);
		font-weight: 400;
		letter-spacing: 0.04em;
	}
	h3 {
		margin: 0;
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 600;
	}
	.lede {
		max-width: 66ch;
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 24rem;
		gap: var(--spacing-500);
		align-items: start;
	}
	.side {
		position: sticky;
		top: 1rem;
	}
	.stamp {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-50) var(--spacing-200);
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.stamp b {
		color: var(--ink);
		font-weight: 600;
	}
	.table-toggle {
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-100) var(--spacing-200);
		background: var(--case-100);
	}
	.table-toggle summary {
		font-weight: 600;
		cursor: pointer;
	}
	.table-toggle[open] summary {
		margin-bottom: var(--spacing-100);
	}
	.fit-comparison {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.fit-comparison caption {
		margin-bottom: var(--spacing-75);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		text-align: left;
	}
	.fit-comparison th,
	.fit-comparison td {
		border-bottom: 1px solid var(--case-300);
		padding: var(--spacing-75) var(--spacing-75);
		text-align: left;
	}
	.fit-comparison thead th {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
		letter-spacing: 0.02em;
	}
	.fit-comparison td {
		font-family: var(--font-mono);
	}
	.tray {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 20rem;
		gap: var(--spacing-400);
		align-items: start;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-300);
		background: var(--case-100);
	}
	.tray > :global(.findings) {
		padding-top: var(--spacing-700);
	}
	.bins {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-300);
	}
	figure {
		display: grid;
		gap: var(--spacing-75);
		margin: 0;
	}
	figcaption {
		display: grid;
		gap: var(--spacing-25);
	}
	figcaption span {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.sources {
		max-width: 90ch;
		border-top: 1px solid var(--case-300);
		padding-top: var(--spacing-200);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	@media (max-width: 1100px) {
		.split,
		.tray {
			grid-template-columns: 1fr;
		}
		.side {
			position: static;
		}
		.tray > :global(.findings) {
			padding-top: 0;
		}
	}
	@media (max-width: 640px) {
		.bins {
			grid-template-columns: 1fr;
		}
	}
	/* Wide tables scroll inside their own container, never the page. */
	.table-scroll {
		min-width: 0;
		overflow-x: auto;
	}
</style>
