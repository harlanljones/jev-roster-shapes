<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Bundle } from '$lib/contracts';
	import { DEFAULT_JEV_MODEL, buildProfileRequest } from '$lib/classification';
	import { calculateComparison, calculatePoolFit, poolFitFor } from '$lib/engine';
	import { storylineRegistry } from '$lib/storylines/registry';
	import DecisionNav from './DecisionNav.svelte';
	import { baselineFor, evidenceFor, provenanceNote } from './classification-evidence';
	import ScenarioPicker from './ScenarioPicker.svelte';
	import { DIAGRAMS, pickScenario } from './decision';
	import CaseKey from './diagrams/CaseKey.svelte';
	import Findings from './diagrams/Findings.svelte';
	import JevCall from './diagrams/JevCall.svelte';
	import PieceDetail from './diagrams/PieceDetail.svelte';
	import SeasonTimeline from './diagrams/SeasonTimeline.svelte';
	import RosterDiagram from './diagrams/RosterDiagram.svelte';
	import { sourceLabels } from './jev-call';
	import { jevRecordFor } from './jev-results';
	import {
		benchTray,
		binFindings,
		buildPool,
		caseView,
		lineupBin,
		lineupIds,
		locksOf,
		scenarioLineup,
		tightestBin
	} from './shape-case';
	import { SPLIT_SOURCE } from './split-evidence';

	// The decision page centers on one diagram (D-50, after the Wyman Diagram
	// guide): the board, now side by side with the Jev call for the selected
	// piece (D-57, layout A); both are primary components. The scenario's nine pieces pack into a board whose lid
	// is the most this pool can field, and everyone left off sits in the tray
	// beside it. The case, the engine's pool fit, the interaction map, and the
	// slot bars are supplementary subpages that share the scenario pick.
	let {
		activeSlug = storylineRegistry[0]?.slug ?? '',
		onOpen
	}: { activeSlug?: string; onOpen: (bundle: Bundle) => void } = $props();

	let pendingOpen = $state(false);
	let selectedId = $state<string | null>(null);

	const story = $derived(
		storylineRegistry.find((storyline) => storyline.slug === activeSlug) ?? storylineRegistry[0]!
	);
	const bundle = $derived(story.bundle);
	const scenario = $derived(pickScenario(bundle, page.url.searchParams.get('scenario')));
	const isBaseline = $derived(scenario.id === bundle.comparison.baseline.id);
	const pool = $derived(buildPool(bundle));
	const calc = $derived(calculateComparison(bundle));
	const engineFit = $derived(poolFitFor(calculatePoolFit(bundle), scenario.id));
	const baseLineup = $derived(scenarioLineup(bundle, bundle.comparison.baseline));
	const lineup = $derived(scenarioLineup(bundle, scenario));
	const view = $derived(caseView(pool, lineup, baseLineup));
	const pinned = $derived(
		calc.results.find((result) => result.scenarioId === scenario.id)?.offense.runs ?? null
	);
	const selected = $derived(
		selectedId && pool.has(selectedId) ? selectedId : (lineup['3B'] ?? lineupIds(lineup)[0] ?? null)
	);

	const locks = $derived(locksOf(scenario));
	const board = $derived(lineupBin(pool, lineup, locks));
	const best = $derived(tightestBin(pool, locks));
	const tray = $derived(benchTray(pool, lineup, locks));
	const reads = $derived(binFindings(pool, lineup, board, best, locks));

	// The Jev call for each player: the exact request, any answer already in
	// this session, and the rule baseline over the same evidence (D-57).
	const note = $derived(provenanceNote(story));
	const baselines = $derived(baselineFor(bundle, pool, note));
	const requests = $derived(
		new Map(
			[...pool.values()].map((player) => [
				player.id,
				buildProfileRequest(evidenceFor(bundle, player, note), DEFAULT_JEV_MODEL)
			])
		)
	);
	const records = $derived(
		new Map([...requests].map(([id, request]) => [id, jevRecordFor(request)]))
	);
	const labels = $derived(
		new Map(
			[...pool.values()].map((player) => [
				player.id,
				sourceLabels(records.get(player.id) ?? null, baselines.get(player.id) ?? null, player.shape)
			])
		)
	);
	const thin = $derived(
		new Set(
			[...records]
				.filter(([, record]) => (record?.answer?.evidenceSufficient ?? 1) < 0.5)
				.map(([id]) => id)
		)
	);
	const leftOff = $derived(board.runs == null || best.runs == null ? null : best.runs - board.runs);

	const runs = (v: number | null) => (v == null ? 'runs unavailable' : `${v.toFixed(1)} runs`);
	/** Engine totals are exact decimal strings, so they are not pre-rounded. */
	const engineDelta = (v: string | null) =>
		v == null
			? 'Δ unavailable'
			: `Δ ${Number(v) >= 0 ? '+' : '−'}${Math.abs(Number(v)).toFixed(3)}`;
	const query = $derived(isBaseline ? '' : `?scenario=${encodeURIComponent(scenario.id)}`);
	const cardStat = $derived<Record<string, string>>({
		case: `${view.findings.nice.length} nice fits · ${view.findings.friction.length} friction · ${view.gaps.length} empty cutouts`,
		engine: `Left on the table ${engineDelta(engineFit?.deltaVsReference?.runs ?? null)} runs`,
		interactions: 'Gray: shared position · red: tested swap · green: complement',
		slots: `Hindsight best nine: ${runs(best.runs)}`
	});

	function openWorkspace(): void {
		onOpen(story.bundle);
	}
</script>

<svelte:head>
	<title>{story.title} · Roster Shapes</title>
	<meta
		name="description"
		content="A 2026 Red Sox roster decision as one board: the lineup's pieces packed under the most the pool can field, and the value left off the field."
	/>
</svelte:head>

<div class="library">
	<SeasonTimeline activeSlug={story.slug} />

	<section class="lead" aria-labelledby="story-title">
		<div class="lead-main">
			<h1 id="story-title">{story.title}</h1>
			<p class="lede">{story.lede}</p>
			<DecisionNav slug={story.slug} current="board" scenarioId={isBaseline ? null : scenario.id} />
			<ScenarioPicker {bundle} {pool} current={scenario} />
		</div>
		<div class="pair">
			<div class="pair-col">
				<RosterDiagram
					{pool}
					bin={board}
					{tray}
					{labels}
					{thin}
					{selected}
					onSelect={(id: string) => (selectedId = id)}
					label="Roster board for {scenario.label}: the lineup packed under the pool's best, and the players left off the field"
				/>
				<dl class="readout" aria-label="Board readout">
					<div>
						<dt>On the field</dt>
						<dd>{runs(board.runs)}</dd>
					</div>
					<div>
						<dt>Filled · gaps · headroom</dt>
						<dd>
							{Math.round(board.fill)}% · {Math.round(board.gaps)}% · {Math.round(board.headroom)}%
						</dd>
					</div>
					<div>
						<dt>Left off vs the pool's best</dt>
						<dd>{runs(leftOff)}</dd>
					</div>
					<div>
						<dt>Off the field</dt>
						<dd>{runs(tray.runs)}</dd>
					</div>
				</dl>
				<p class="stamp">
					<span>Board numbers: actual 2026 through {SPLIT_SOURCE.asOf} (display layer)</span>
					<span
						>Pinned 10-game engine total <b>{pinned ?? 'unavailable'}</b> runs (the workspace number)</span
					>
				</p>
				{#if selected}
					<PieceDetail {pool} playerId={selected} role={view.roleOf.get(selected)} />
				{/if}
			</div>
			<aside class="pair-col" aria-label="Jev call and actions">
				{#if selected && requests.get(selected)}
					<JevCall
						name={pool.get(selected)?.name ?? selected}
						request={requests.get(selected)!}
						record={records.get(selected) ?? null}
						compare={{
							baseline: baselines.get(selected) ?? null,
							analyst: pool.get(selected)?.shape ?? null
						}}
					/>
				{/if}
				<p class="call-note">
					Answers appear here after a call on <a
						href={resolve('/scenario/[slug]/snapshots', { slug: story.slug })}>Snapshots</a
					>, for this browser session only.
				</p>
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
				<CaseKey compact />
			</aside>
		</div>
	</section>

	<section class="block" aria-labelledby="board-reads">
		<h2 id="board-reads">What the board shows</h2>
		<p class="data-class-banner">
			<strong>Public data</strong> · engine rates are observed R/PA ({story.rateLabel}), what was
			known on the decision date, not team-approved projections. The board sizes pieces by what the
			2026 season produced through {SPLIT_SOURCE.asOf}.
			{story.eventBasis}
		</p>
		<Findings
			groups={[
				{ title: 'Empty space', tone: 'empty', items: reads[0] ?? [], none: 'None.' },
				{ title: 'Snug fits', tone: 'nice', items: reads[1] ?? [], none: 'None.' },
				{ title: 'Awkward shapes', tone: 'friction', items: reads[2] ?? [], none: 'None.' }
			]}
		/>
	</section>

	<section class="block" aria-labelledby="more-heading">
		<h2 id="more-heading">Behind the board</h2>
		<ul class="cards">
			{#each DIAGRAMS as d (d.key)}
				<li>
					<a
						class="card"
						href="{resolve('/scenario/[slug]/[diagram=diagram]', {
							slug: story.slug,
							diagram: d.key
						})}{query}"
					>
						<span class="card-title">{d.title}</span>
						<span class="card-blurb">{d.blurb}</span>
						<span class="card-stat">{cardStat[d.key]}</span>
					</a>
				</li>
			{/each}
			<li>
				<a class="card" href={resolve('/scenario/[slug]/snapshots', { slug: story.slug })}>
					<span class="card-title">Snapshots</span>
					<span class="card-blurb">The Jev prompt and its answers beside the roster.</span>
					<span class="card-stat">Advisory only; never moves a number</span>
				</a>
			</li>
		</ul>
	</section>

	<footer class="sources">
		Players, eligibility and observed R/PA come from the eight checked-in season-timeline bundles ({story.sourceLabel}).
		Splits and PA come from {SPLIT_SOURCE.label}, fetched {SPLIT_SOURCE.fetchedAt}. Shapes follow
		rubric v2, where a Star is a tough fit rather than a star player. The board is a hindsight
		display layer over actual 2026 production; the engine's pool fit uses the bundle's dated metric
		only, which is why the two can disagree. Split run estimates are a judgment layer and never
		change an engine number.
		{#if (story.bundle.comparison.baseline.projectedStarters ?? []).length > 0}
			This decision's lineups are the projected 2027 roster from early-October reporting (D-56), and
			its starters are locked into every searched best nine.
		{/if}
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
		gap: 1.25rem;
	}
	.lead-main,
	.pair-col {
		display: grid;
		gap: 1.25rem;
		align-content: start;
		min-width: 0;
	}
	.pair {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
	}
	.call-note {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.8rem;
	}
	.call-note a {
		color: var(--marker);
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
	.lede {
		max-width: 66ch;
		margin: 0;
		color: var(--ink-soft);
		font-size: 1rem;
		line-height: 1.55;
	}
	.data-class-banner {
		max-width: 80ch;
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
	.readout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.75rem;
		margin: 0;
	}
	.readout div {
		border: 1px solid var(--rule);
		border-radius: 8px;
		padding: 0.6rem 0.8rem;
		background: var(--panel);
	}
	.readout dt {
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.readout dd {
		margin: 0.2rem 0 0;
		font: 600 clamp(0.85rem, 4.2vw, 1.05rem) var(--mono);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
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
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.card {
		display: grid;
		gap: 0.4rem;
		height: 100%;
		box-sizing: border-box;
		border: 1px solid var(--rule);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		color: var(--ink);
		background: var(--panel);
		text-decoration: none;
	}
	.card:hover {
		border-color: var(--ink-soft);
	}
	.card-title {
		font-family: var(--display);
		font-size: 1.2rem;
		letter-spacing: 0.04em;
	}
	.card-blurb {
		color: var(--ink-soft);
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.card-stat {
		align-self: end;
		color: var(--marker);
		font: 500 0.75rem var(--mono);
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
		.pair {
			grid-template-columns: 1fr;
		}
	}
</style>
