<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Bundle } from '$lib/contracts';
	import { calculateComparison, calculatePoolFit, poolFitFor } from '$lib/engine';
	import { storylineRegistry } from '$lib/storylines/registry';
	import { TESTED_SCENARIOS } from './case-stories';
	import CapacityBin from './diagrams/CapacityBin.svelte';
	import CaseKey from './diagrams/CaseKey.svelte';
	import CaseTable from './diagrams/CaseTable.svelte';
	import EngineFit from './diagrams/EngineFit.svelte';
	import Findings from './diagrams/Findings.svelte';
	import InteractionMap from './diagrams/InteractionMap.svelte';
	import PieceDetail from './diagrams/PieceDetail.svelte';
	import SeasonTimeline from './diagrams/SeasonTimeline.svelte';
	import ShapeCase from './diagrams/ShapeCase.svelte';
	import SlotBars from './diagrams/SlotBars.svelte';
	import {
		barFill,
		barFindings,
		binFindings,
		buildPool,
		caseView,
		interactionEdges,
		interactionFindings,
		lineupBin,
		lineupIds,
		lineupRuns,
		scenarioLineup,
		tightestBin,
		tightestFit
	} from './shape-case';
	import { SPLIT_SOURCE } from './split-evidence';

	// The landing page is the case (D-43): the storyline's roster as a fitted
	// equipment case, then the same pieces off the field, packed into a bin,
	// and laid out slot by slot. Everything sized here is a display layer over
	// actual 2026 production; the workspace keeps the pinned engine totals.
	let {
		activeSlug = storylineRegistry[0]?.slug ?? '',
		onOpen
	}: { activeSlug?: string; onOpen: (bundle: Bundle) => void } = $props();

	let pendingOpen = $state(false);
	let picks = $state<Record<string, string>>({});
	let selectedId = $state<string | null>(null);

	const story = $derived(
		storylineRegistry.find((storyline) => storyline.slug === activeSlug) ?? storylineRegistry[0]!
	);
	const bundle = $derived(story.bundle);
	const scenarios = $derived([bundle.comparison.baseline, ...bundle.comparison.candidates]);
	const scenario = $derived(
		scenarios.find((s) => s.id === picks[story.slug]) ?? bundle.comparison.baseline
	);
	const pool = $derived(buildPool(bundle));
	const calc = $derived(calculateComparison(bundle));
	const analysis = $derived(calculatePoolFit(bundle));
	const engineFit = $derived(poolFitFor(analysis, scenario.id));
	const baseLineup = $derived(scenarioLineup(bundle, bundle.comparison.baseline));
	const lineup = $derived(scenarioLineup(bundle, scenario));
	const view = $derived(caseView(pool, lineup, baseLineup));
	const baseRuns = $derived(lineupRuns(pool, baseLineup));
	const pinned = $derived(
		calc.results.find((result) => result.scenarioId === scenario.id)?.offense.runs ?? null
	);
	const selected = $derived(
		selectedId && pool.has(selectedId) ? selectedId : (lineup['3B'] ?? lineupIds(lineup)[0] ?? null)
	);

	const edges = $derived(
		interactionEdges(
			pool,
			TESTED_SCENARIOS.filter((t) => t.story === story.slug)
		)
	);
	const netFind = $derived(interactionFindings(pool, edges));
	const curBin = $derived(lineupBin(pool, lineup));
	const bestBin = $derived(tightestBin(pool));
	const binFind = $derived(binFindings(pool, lineup, curBin, bestBin));
	const fit = $derived(tightestFit(pool));
	const curBars = $derived(barFill(pool, lineup, lineup));
	const bestBars = $derived(barFill(pool, fit.L, fit.R));
	const barPx = $derived(800 / Math.max(curBars.pa, bestBars.pa));
	const barFind = $derived(barFindings(pool, curBars, bestBars));

	const runs = (v: number | null) => (v == null ? 'runs unavailable' : `${v.toFixed(1)} runs`);
	const delta = (v: number | null) =>
		v == null ? 'Δ unavailable' : `Δ ${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
	/** Engine totals are exact decimal strings, so they are not pre-rounded. */
	const engineDelta = (v: string | null) =>
		v == null
			? 'Δ unavailable'
			: `Δ ${Number(v) >= 0 ? '+' : '−'}${Math.abs(Number(v)).toFixed(3)}`;
	const binStats = (b: { fill: number; gaps: number; headroom: number }) =>
		`${Math.round(b.fill)}% filled · ${Math.round(b.gaps)}% gaps · ${Math.round(b.headroom)}% headroom`;
	const nameOf = (playerId: string) => pool.get(playerId)?.name ?? playerId;
	const longDate = (iso: string) =>
		new Date(`${iso}T00:00:00Z`).toLocaleString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});

	function pickScenario(id: string): void {
		picks[story.slug] = id;
	}
	function openWorkspace(): void {
		onOpen(story.bundle);
	}
</script>

<svelte:head>
	<title>{story.title} · Roster Shapes</title>
	<meta
		name="description"
		content="The 2026 Red Sox position-player roster as a fitted case: shapes, fits, and the value each lineup leaves off."
	/>
</svelte:head>

<div class="library">
	<SeasonTimeline activeSlug={story.slug} />

	<section class="lead" aria-labelledby="story-title">
		<div class="lead-main">
			<h1 id="story-title">{story.title}</h1>
			<p class="lede">{story.lede}</p>
			<p class="data-class-banner">
				<strong>Public data</strong> · engine rates are observed R/PA ({story.rateLabel}), what was
				known on the decision date, not team-approved projections. The case sizes pieces by what the
				2026 season produced through {SPLIT_SOURCE.asOf}.
				{story.eventBasis}
			</p>
			<div class="scenarios" role="group" aria-label="Scenario in the case">
				{#each scenarios as s (s.id)}
					{@const r = lineupRuns(pool, scenarioLineup(bundle, s))}
					<button
						type="button"
						class="scenario"
						aria-pressed={s.id === scenario.id}
						onclick={() => pickScenario(s.id)}
					>
						<span>{s.label}</span>
						<small
							>{runs(r)} · {s.id === bundle.comparison.baseline.id
								? 'baseline'
								: delta(r == null || baseRuns == null ? null : r - baseRuns)}</small
						>
					</button>
				{/each}
			</div>
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
		</div>
		<aside class="lead-side" aria-label="Selected piece and actions">
			{#if selected}
				<PieceDetail {pool} playerId={selected} role={view.roleOf.get(selected)} />
			{/if}
			<button class="primary-button" type="button" onclick={() => (pendingOpen = true)}
				>Open workspace</button
			>
			{#if pendingOpen}
				<div class="ack-box" role="group" aria-label="Public data acknowledgment">
					<p>
						This scenario uses observed public values, not team-approved projections. Open it for
						local review?
					</p>
					<div class="ack-actions">
						<button class="primary-button" type="button" onclick={openWorkspace}
							>Open public scenario</button
						><button class="secondary-button" type="button" onclick={() => (pendingOpen = false)}
							>Keep browsing</button
						>
					</div>
				</div>
			{/if}
			<CaseKey />
		</aside>
	</section>

	<section class="block" aria-labelledby="case-reads">
		<h2 id="case-reads">What the case shows</h2>
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
	</section>

	<section class="block" aria-labelledby="engine-heading">
		<div class="block-head">
			<h2 id="engine-heading">What the roster could have done instead</h2>
			<a class="snapshots-link" href={resolve('/scenario/[slug]/snapshots', { slug: story.slug })}
				>Snapshots: the Jev prompt and its answers →</a
			>
		</div>
		<p class="lede">
			The engine searches each scenario's own roster for the best nine it can field — one lineup per
			pitcher-hand context — and then judges that lineup with the same feasibility, coverage, and
			capacity rules as any other scenario. Everything below is dated evidence: rates known on {longDate(
				story.eventDate
			)}, not hindsight.
		</p>
		<table class="fit-comparison">
			<caption>
				Pool fit against the lineup each scenario used, over the same illustrative ten-game horizon
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
						<td>{analysis.best?.scenarioId === row.scenarioId ? 'highest available fit' : ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if engineFit}
			<EngineFit fit={engineFit} {nameOf} label="Pool fit for {scenario.label}" />
		{/if}
	</section>

	<section class="tray" aria-labelledby="map-title">
		<div class="tray-main">
			<h2 id="map-title">How the pieces interact</h2>
			<p class="lede">
				The same pieces off the field. Gray lines share a position, red arrows are the swaps this
				storyline tests (thick in this scenario) with the change in actual 2026 runs, green dots
				pair players whose real splits complement, and blue dashes lead into the DH lane.
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
				{ title: 'Pieces with no neighbor', tone: 'empty', items: netFind[0] ?? [], none: 'None.' },
				{ title: 'Crowded clusters', tone: 'friction', items: netFind[1] ?? [], none: 'None.' },
				{ title: 'Chain reactions', tone: 'nice', items: netFind[2] ?? [], none: 'None.' }
			]}
		/>
	</section>

	<section class="tray" aria-labelledby="bin-title">
		<div class="tray-main">
			<h2 id="bin-title">What's left off</h2>
			<p class="lede">
				The roster as a bin, sized by what the 2026 season actually produced — a hindsight display
				layer, kept apart from the engine's fit above. Each lineup slot is one piece, dropped in by
				gravity, biggest first. Empty space is whatever the shapes don't cover: gaps where outlines
				don't nest, and headroom above the pile. The lid is where the hindsight best nine tops out.
			</p>
			<div class="bins">
				<figure>
					<figcaption>
						<h3>This lineup</h3>
						<span>{binStats(curBin)} · {runs(curBin.runs)}</span>
					</figcaption>
					<CapacityBin
						{pool}
						bin={curBin}
						label="{scenario.label} packed into the bin: {binStats(curBin)}"
					/>
				</figure>
				<figure>
					<figcaption>
						<h3>Hindsight best nine, platoons and position moves</h3>
						<span>{binStats(bestBin)} · {runs(bestBin.runs)}</span>
					</figcaption>
					<CapacityBin
						{pool}
						bin={bestBin}
						label="The hindsight best nine packed into the bin: {binStats(bestBin)}"
					/>
				</figure>
			</div>
		</div>
		<Findings
			columns={false}
			groups={[
				{ title: 'Empty space', tone: 'empty', items: binFind[0] ?? [], none: 'None.' },
				{ title: 'Snug fits', tone: 'nice', items: binFind[1] ?? [], none: 'None.' },
				{ title: 'Awkward shapes', tone: 'friction', items: binFind[2] ?? [], none: 'None.' }
			]}
		/>
	</section>

	<section class="tray" aria-labelledby="bars-title">
		<div class="tray-main">
			<h2 id="bars-title">Slot by slot</h2>
			<p class="lede">
				The same capacity as bars. Each column is as wide as the occupant's actual PA and splits at
				his real share against each hand; a band fills with estimated runs per PA against that hand,
				and full is .150. Dotted lines mark the 2026 league average.
			</p>
			<h3 class="bars-title">This lineup · {Math.round(curBars.pct)}% filled</h3>
			<SlotBars
				{pool}
				bars={curBars}
				px={barPx}
				label="{scenario.label} slot by slot: {Math.round(curBars.pct)}% of the container filled"
			/>
			<h3 class="bars-title">Hindsight best nine · {Math.round(bestBars.pct)}% filled</h3>
			<SlotBars
				{pool}
				bars={bestBars}
				px={barPx}
				label="The hindsight best nine slot by slot: {Math.round(bestBars.pct)}% filled"
			/>
		</div>
		<Findings
			columns={false}
			groups={[
				{
					title: 'Where the empty space is',
					tone: 'empty',
					items: barFind[0] ?? [],
					none: 'None.'
				},
				{
					title: 'Tightest fit this pool allows',
					tone: 'nice',
					items: barFind[1] ?? [],
					none: 'None.'
				},
				{ title: "Pieces that don't fit", tone: 'friction', items: barFind[2] ?? [], none: 'None.' }
			]}
		/>
	</section>

	<footer class="sources">
		Players, eligibility and observed R/PA come from the five checked-in season-timeline bundles ({story.sourceLabel}).
		Splits and PA come from {SPLIT_SOURCE.label}, fetched {SPLIT_SOURCE.fetchedAt}. Shapes follow
		rubric v2, where a Star is a tough fit rather than a star player. Cutout asks, fit grades, and
		split run estimates are a judgment layer and never change an engine number. The engine's pool
		fit above uses the bundle's dated metric only, and the hindsight diagrams below and after it use
		the season's actual production, which is why the two can disagree.
	</footer>
</div>

<style>
	.library {
		display: grid;
		gap: 3rem;
		max-width: 88rem;
		margin: 0 auto;
		padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem;
	}
	.lead {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 24rem;
		gap: 2.5rem;
		align-items: start;
	}
	.lead-main,
	.lead-side,
	.tray-main {
		display: grid;
		gap: 1.25rem;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: clamp(2.25rem, 5vw, 3.75rem);
		font-weight: 400;
		letter-spacing: 0.01em;
		line-height: 1;
		text-wrap: balance;
	}
	h2 {
		margin: 0;
		font-family: var(--display);
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 400;
		letter-spacing: 0.04em;
	}
	h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}
	.lede {
		max-width: 66ch;
		margin: 0;
		color: var(--ink-soft);
		font-size: 1rem;
		line-height: 1.55;
	}
	.data-class-banner {
		max-width: 66ch;
		margin: 0;
		border: 1px solid var(--marker);
		border-radius: 8px;
		padding: 0.55rem 0.8rem;
		color: var(--ink-soft);
		background: var(--panel);
		font-size: 0.82rem;
	}
	.data-class-banner strong {
		color: var(--ink);
	}
	.scenarios {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.scenario {
		display: grid;
		gap: 0.1rem;
		min-height: 2.75rem;
		border: 1px solid var(--rule);
		border-radius: 8px;
		padding: 0.6rem 0.9rem;
		color: var(--ink);
		background: var(--panel);
		font: inherit;
		font-size: 0.9rem;
		text-align: left;
		cursor: pointer;
	}
	.scenario small {
		color: var(--ink-soft);
		font-family: var(--mono);
		font-size: 0.75rem;
	}
	.scenario[aria-pressed='true'] {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}
	.stamp {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1.25rem;
		margin: 0;
		color: var(--ink-soft);
		font-family: var(--mono);
		font-size: 0.78rem;
	}
	.stamp b {
		color: var(--ink);
		font-weight: 600;
	}
	.lead-side {
		position: sticky;
		top: 1rem;
	}
	.primary-button,
	.secondary-button {
		min-height: 2.75rem;
		border: 1px solid var(--ink);
		border-radius: 8px;
		padding: 0.6rem 1rem;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}
	.primary-button {
		color: var(--panel);
		background: var(--ink);
	}
	.secondary-button {
		color: var(--ink);
		background: var(--panel);
	}
	.ack-box {
		display: grid;
		gap: 0.6rem;
		border: 1px solid var(--marker);
		border-radius: 8px;
		padding: 0.85rem;
		background: var(--panel);
		font-size: 0.85rem;
	}
	.ack-box p {
		margin: 0;
	}
	.ack-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.block {
		display: grid;
		gap: 1.25rem;
	}
	.block-head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		align-items: baseline;
		justify-content: space-between;
	}
	.snapshots-link {
		color: var(--marker);
		font: 500 0.8rem var(--mono);
		text-decoration: none;
	}
	.snapshots-link:hover {
		text-decoration: underline;
	}
	.fit-comparison {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.fit-comparison caption {
		margin-bottom: 0.4rem;
		color: var(--ink-soft);
		font-size: 0.8rem;
		text-align: left;
	}
	.fit-comparison th,
	.fit-comparison td {
		border-bottom: 1px solid var(--rule);
		padding: 0.4rem 0.5rem;
		text-align: left;
	}
	.fit-comparison thead th {
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.fit-comparison td {
		font-family: var(--mono);
	}
	.table-toggle {
		border: 1px solid var(--rule);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		background: var(--panel);
	}
	.table-toggle summary {
		font-weight: 600;
		cursor: pointer;
	}
	.table-toggle[open] summary {
		margin-bottom: 0.75rem;
	}
	.tray {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 20rem;
		gap: 2.25rem;
		align-items: start;
		border: 1px solid var(--rule);
		border-radius: 12px;
		padding: clamp(1rem, 3vw, 1.75rem);
		background: var(--panel);
		box-shadow:
			0 1px 2px rgb(22 32 42 / 6%),
			0 8px 20px rgb(22 32 42 / 6%);
	}
	.tray > :global(.findings) {
		padding-top: 4rem;
	}
	.bins {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
	}
	figure {
		display: grid;
		gap: 0.5rem;
		margin: 0;
	}
	figcaption {
		display: grid;
		gap: 0.15rem;
	}
	figcaption span {
		color: var(--ink-soft);
		font-family: var(--mono);
		font-size: 0.75rem;
	}
	.bars-title {
		margin-top: 0.5rem;
	}
	.sources {
		max-width: 90ch;
		border-top: 1px solid var(--rule);
		padding-top: 1rem;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.6;
	}
	@media (max-width: 1100px) {
		.lead,
		.tray {
			grid-template-columns: 1fr;
		}
		.lead-side {
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
</style>
