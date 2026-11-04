<script lang="ts">
	import { formatDay } from './season-timeline';
	import { resolve } from '$app/paths';
	import { detailQuery, scenarioQuery } from './routes';
	import { page } from '$app/state';
	import { DEFAULT_JEV_MODEL, buildProfileRequest } from '$lib/classification';
	import { calculateComparison, calculatePoolFit, poolFitFor } from '$lib/engine';
	import { storylineRegistry, storylinesByDate } from '$lib/storylines/registry';
	import Icon from '$lib/ui/Icon.svelte';
	import { reveal } from './reveal';
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
	import { isThinEvidence, sourceLabels } from './jev-call';
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

	// The decision page leads with the Jev call for the selected piece (D-60):
	// its instructions, criteria, and recorded decisions are the homepage's
	// primary component, with the board — the scenario's nine pieces packed
	// under the most this pool can field, everyone left off in the tray beside
	// it — as the supporting diagram. The case, the engine's pool fit, the
	// interaction map, and the slot bars are supplementary subpages that share
	// the scenario pick (D-50).
	// The workspace is a link: its own URL collects the D-36 acknowledgment (CompareGate), so
	// the board carries no second prompt of its own.
	let { activeSlug = storylineRegistry[0]?.slug ?? '' }: { activeSlug?: string } = $props();

	let selectedId = $state<string | null>(null);

	const story = $derived(
		storylineRegistry.find((storyline) => storyline.slug === activeSlug) ?? storylineRegistry[0]!
	);
	const position = $derived(storylinesByDate.findIndex((s) => s.slug === story.slug));
	const prev = $derived(position > 0 ? storylinesByDate[position - 1] : undefined);
	const next = $derived(storylinesByDate[position + 1]);
	const eventDay = (iso: string) => formatDay(iso);
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
		new Set([...records].filter(([, record]) => isThinEvidence(record)).map(([id]) => id))
	);
	const leftOff = $derived(board.runs == null || best.runs == null ? null : best.runs - board.runs);

	const runs = (v: number | null) => (v == null ? 'runs unavailable' : `${v.toFixed(1)} runs`);
	/** Engine totals are exact decimal strings, so they are not pre-rounded. */
	const engineDelta = (v: string | null) =>
		v == null
			? 'Δ unavailable'
			: `Δ ${Number(v) >= 0 ? '+' : '−'}${Math.abs(Number(v)).toFixed(3)}`;
	const cardStat = $derived<Record<string, string>>({
		case: `${view.findings.nice.length} nice fits · ${view.findings.friction.length} friction · ${view.gaps.length} empty cutouts`,
		engine: `Left on the table ${engineDelta(engineFit?.deltaVsReference?.runs ?? null)} runs`,
		interactions: 'Gray: shared position · arrow: tested swap · dotted: complement',
		slots: `Hindsight best nine: ${runs(best.runs)}`
	});
</script>

<svelte:head>
	<title>{story.title} · Roster Shapes</title>
	<meta
		name="description"
		content="A 2026 Red Sox roster decision as one board: the lineup's pieces packed under the most the pool can field, and the value left off the field."
	/>
</svelte:head>

<div class="library">
	<section class="lead" aria-labelledby="story-title">
		<div class="lead-main">
			<nav class="sequence" aria-label="Decisions in order">
				<span class="sequence-at"
					>Decision {position + 1} of {storylineRegistry.length} · {eventDay(story.eventDate)}</span
				>
				{#if prev}<a href={resolve('/decisions/[slug]', { slug: prev.slug })}
						><Icon name="arrow-left" size={16} />{prev.short}</a
					>{/if}
				{#if next}<a href={resolve('/decisions/[slug]', { slug: next.slug })}
						>{next.short}<Icon name="arrow-right" size={16} /></a
					>{/if}
			</nav>
			<h1 id="story-title" class="page-title">{story.title}</h1>
			<p class="lede">{story.lede}</p>
			<DecisionNav slug={story.slug} current="board" scenarioId={isBaseline ? null : scenario.id} />
			<ScenarioPicker {bundle} {pool} current={scenario} />
		</div>
		<div class="pair">
			<section class="pair-col" aria-label="Jev call">
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
					Answers are recorded by CI when new snapshots reach main; <a
						href={resolve('/decisions/[slug]/snapshots', { slug: story.slug })}>Snapshots</a
					> shows every answer and the request behind it.
				</p>
			</section>
			<aside class="pair-col" aria-label="Roster board and actions">
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
				<a
					class="button button-primary open-workspace"
					href="{resolve('/decisions/[slug]/compare', { slug: story.slug })}{scenarioQuery(
						isBaseline ? null : scenario.id
					)}">Open workspace</a
				>
				<CaseKey compact />
			</aside>
		</div>
	</section>

	<section class="block" aria-labelledby="board-reads">
		<h2 id="board-reads">What the board shows</h2>
		<p class="data-class-banner">
			<strong>Public data</strong> · engine rates are observed R/PA ({story.rateLabel}), what was
			known on the decision date, not team approved projections. The board sizes pieces by what the
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
						href="{resolve('/decisions/[slug]/detail', { slug: story.slug })}{detailQuery(
							d.key,
							isBaseline ? null : scenario.id
						)}"
					>
						<span class="card-title">{d.title}</span>
						<span class="card-blurb">{d.blurb}</span>
						<span class="card-stat">{cardStat[d.key]}</span>
					</a>
				</li>
			{/each}
			<li>
				<a class="card" href={resolve('/decisions/[slug]/snapshots', { slug: story.slug })}>
					<span class="card-title">Snapshots</span>
					<span class="card-blurb">The Jev prompt and its answers beside the roster.</span>
					<span class="card-stat">Advisory only; never moves a number</span>
				</a>
			</li>
		</ul>
	</section>

	<section class="block" aria-labelledby="season-heading" use:reveal>
		<h2 id="season-heading">Where this decision sits in the season</h2>
		<SeasonTimeline activeSlug={story.slug} />
	</section>

	<footer class="sources">
		Players, eligibility and observed R/PA come from the eight checked in season timeline bundles ({story.sourceLabel}).
		Splits and PA come from {SPLIT_SOURCE.label}, fetched {SPLIT_SOURCE.fetchedAt}. Shapes follow
		rubric v2, where a Star is a tough fit rather than a star player. The board is a hindsight
		display layer over actual 2026 production; the engine's pool fit uses the bundle's dated metric
		only, which is why the two can disagree. Split run estimates are a judgment layer and never
		change an engine number.
		{#if (story.bundle.comparison.baseline.projectedStarters ?? []).length > 0}
			This decision's lineups are the projected 2027 roster from early October reporting (D-56), and
			its starters are locked into every searched best nine.
		{/if}
	</footer>
</div>

<style>
	.library {
		display: grid;
		gap: var(--spacing-600);
		max-width: 88rem;
		margin: 0 auto;
		padding: var(--spacing-300) var(--spacing-300) var(--spacing-700);
	}
	.lead {
		display: grid;
		gap: var(--spacing-200);
	}
	.lead-main,
	.pair-col {
		display: grid;
		gap: var(--spacing-200);
		align-content: start;
		min-width: 0;
	}
	.pair {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--spacing-300);
		align-items: start;
	}
	.call-note {
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.call-note a {
		color: var(--turf);
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
	.lede {
		max-width: 66ch;
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
	}
	.data-class-banner {
		max-width: 80ch;
		margin: 0;
		border: 1px solid var(--turf);
		border-radius: var(--radius-md);
		padding: var(--spacing-75) var(--spacing-100);
		color: var(--ink-muted);
		background: var(--case-100);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.data-class-banner strong {
		color: var(--ink);
	}
	.readout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(10rem, 100%), 1fr));
		gap: var(--spacing-100);
		margin: 0;
	}
	.readout div {
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-75) var(--spacing-100);
		background: var(--case-100);
	}
	.readout dt {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
		letter-spacing: 0.02em;
	}
	.readout dd {
		margin: var(--spacing-50) 0 0;
		font-family: var(--font-mono);
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
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
	.open-workspace {
		justify-self: start;
	}
	.block {
		display: grid;
		gap: var(--spacing-200);
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(15rem, 100%), 1fr));
		gap: var(--spacing-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.card {
		display: grid;
		gap: var(--spacing-75);
		height: 100%;
		box-sizing: border-box;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-200) var(--spacing-200);
		color: var(--ink);
		background: var(--case-100);
		text-decoration: none;
	}
	.card:hover {
		border-color: var(--ink-muted);
	}
	.card-title {
		font-family: var(--font-sans);
		font-size: var(--text-lg);
		line-height: var(--text-lg--lh);
		letter-spacing: 0.04em;
	}
	.card-blurb {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.card-stat {
		align-self: end;
		color: var(--turf);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
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
		.pair {
			grid-template-columns: 1fr;
		}
	}
	.sequence {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-75) var(--spacing-300);
		margin-bottom: var(--spacing-200);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
	.sequence-at {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	@media (max-width: 520px) {
		.sequence-at {
			flex-basis: 100%;
		}
	}
	.sequence a {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-50);
		min-height: 44px;
		color: var(--ink);
		font-weight: 500;
		text-decoration: underline;
		text-decoration-color: var(--case-400);
		text-underline-offset: 4px;
	}
	.sequence a:hover {
		text-decoration-color: currentColor;
	}
</style>
