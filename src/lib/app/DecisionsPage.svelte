<script lang="ts">
	import { resolve } from '$app/paths';
	import { storylineRegistry, type Storyline } from '$lib/storylines/registry';
	import SeasonTimeline from './diagrams/SeasonTimeline.svelte';
	import { formatDay, recordSeries, todayMarker } from './season-timeline';

	// The season index (D-46): `/` is the timeline and the eight dated decisions,
	// and nothing else. Each decision owns `/decisions/[slug]`, including the one
	// this page used to render inline, so no page has two URLs.
	let { today }: { today?: string } = $props();

	const marker = $derived(todayMarker(today));
	const series = recordSeries();
	const longDate = (iso: string) => formatDay(iso);
	const recordOn = (iso: string) => {
		let found: (typeof series)[number] | null = null;
		for (const point of series) {
			if (point.date > iso) break;
			found = point;
		}
		return found;
	};
	// Display-only precision: values stay as the registry strings; only the label is rounded.
	const runs = (value: string | null) =>
		value === null || !Number.isFinite(Number(value)) ? 'unavailable' : Number(value).toFixed(2);
	const decisions = storylineRegistry
		.map((story: Storyline, index) => {
			const point = recordOn(story.eventDate);
			return {
				story,
				number: index + 1,
				record: point ? `${point.wins}–${point.losses}` : 'preseason',
				href: resolve('/decisions/[slug]', { slug: story.slug })
			};
		})
		.sort((left, right) => left.story.eventDate.localeCompare(right.story.eventDate))
		.map((entry, index) => ({ ...entry, number: index + 1 }));
</script>

<svelte:head>
	<title>Roster Shapes · The 2026 Red Sox season</title>
	<meta
		name="description"
		content="Eight roster decisions and milestones from the 2026 Red Sox season on one timeline, each with its case, engine numbers, and data snapshot."
	/>
</svelte:head>

<div class="index">
	<header class="lead">
		<h1 class="page-title">Eight roster decisions on one season timeline</h1>
		<p class="lede">
			Boston's 2026 season as games over .500, with each decision pinned to its event or decision
			milestone. Today is <b>{longDate(marker.date)}</b>. Pick a decision to open its case: the
			roster as a fitted set of shapes, the engine's own numbers for the lineup used against the two
			alternatives, and the best lineup that roster could have produced.
		</p>
	</header>

	<SeasonTimeline today={marker.date} />

	<section class="decisions" aria-labelledby="decisions-heading">
		<h2 id="decisions-heading">The decisions</h2>
		<ol class="cards">
			{#each decisions as entry (entry.story.slug)}
				<li class="card">
					<article class="parts">
						<div class="card-topline">
							<span class="num" aria-hidden="true">{entry.number}</span>
							<span class="when">
								{longDate(entry.story.eventDate)} · {entry.record}
							</span>
						</div>
						<h3>
							<a href={entry.href}>{entry.story.title}</a>
						</h3>
						<p class="question">{entry.story.lede}</p>
						<dl class="numbers">
							<div>
								<dt>Baseline</dt>
								<dd>{runs(entry.story.expected[0]?.offenseRuns ?? null)} runs</dd>
							</div>
							{#each entry.story.expected.slice(1) as expectation (expectation.scenarioId)}
								<div>
									<dt>{expectation.scenarioId === 'cand-a' ? 'A' : 'B'}</dt>
									<dd>
										{runs(expectation.offenseRuns)}
										<span class="delta">
											{expectation.offenseDelta === null
												? 'Δ unavailable'
												: `Δ ${Number(expectation.offenseDelta) >= 0 ? '+' : '−'}${Math.abs(Number(expectation.offenseDelta)).toFixed(2)}`}
										</span>
									</dd>
								</div>
							{/each}
						</dl>
						<p class="meta">
							{entry.story.rateLabel} rates · illustrative ten game horizon · pins marked on the timeline
							above
						</p>
					</article>
				</li>
			{/each}
		</ol>
		<p class="note">
			Every number above uses observed public R/PA through the applicable as of date. The offseason
			milestones retain rates through the 2026 regular season close (September 27); none are
			projections. The engine's totals, the pool's tightest fit, and the coverage and workload
			checks live on each decision's page, with the Jev prompt and its answers one click away under
			Snapshots.
		</p>
	</section>
</div>

<style>
	.index {
		display: grid;
		gap: var(--spacing-400);
		max-width: 88rem;
		margin: 0 auto;
		padding: var(--spacing-300) var(--spacing-300) var(--spacing-700);
	}
	.lead {
		display: grid;
		gap: var(--spacing-100);
	}
	h1 {
		max-width: 20ch;
		margin: 0;
	}
	h2 {
		margin: 0;
		font-size: var(--text-xl);
		line-height: var(--text-xl--lh);
		font-weight: 600;
	}
	.lede {
		max-width: 70ch;
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
	}
	.lede b {
		color: var(--turf);
	}
	.decisions {
		display: grid;
		gap: var(--spacing-200);
	}
	.when {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 400;
		letter-spacing: 0.03em;
	}
	.note {
		max-width: 90ch;
		margin: 0;
		border-top: 1px solid var(--case-300);
		padding-top: var(--spacing-200);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	/* D-62: a ruled list rather than a row of equal cards (redesign-existing-projects). */
	.cards {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--case-300);
	}
	.card {
		border-bottom: 1px solid var(--case-300);
	}
	.parts {
		display: grid;
		grid-template-columns: minmax(0, 11rem) minmax(0, 1fr) minmax(0, 17rem);
		grid-template-areas:
			'when title numbers'
			'when question numbers'
			'when meta numbers';
		column-gap: var(--spacing-400);
		row-gap: var(--spacing-75);
		padding-block: var(--spacing-300);
	}
	.card-topline {
		grid-area: when;
		display: grid;
		align-content: start;
		gap: var(--spacing-50);
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.num {
		color: var(--turf);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 500;
	}
	h3 {
		grid-area: title;
		margin: 0;
		font-size: var(--text-xl);
		line-height: var(--text-xl--lh);
	}
	h3 a {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--case-400);
		text-underline-offset: 4px;
	}
	h3 a:hover {
		text-decoration-color: currentColor;
	}
	.question {
		grid-area: question;
		max-width: var(--measure);
		margin: 0;
		color: var(--ink-muted);
	}
	.meta {
		grid-area: meta;
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.numbers {
		grid-area: numbers;
		display: grid;
		align-content: start;
		gap: var(--spacing-75);
		margin: 0;
	}
	.numbers div {
		display: flex;
		justify-content: space-between;
		gap: var(--spacing-200);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
	.numbers dt {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
		letter-spacing: 0.02em;
	}
	.numbers dd {
		margin: 0;
		font-weight: 600;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.delta {
		display: block;
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	@media (max-width: 900px) {
		.parts {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: 'when' 'title' 'question' 'numbers' 'meta';
		}
	}
</style>
