<script lang="ts">
	import { resolve } from '$app/paths';
	import { storylineRegistry, type Storyline } from '$lib/storylines/registry';
	import SeasonTimeline from './diagrams/SeasonTimeline.svelte';
	import { recordSeries, todayMarker } from './season-timeline';

	// The season index (D-46): `/` is the timeline and the five dated decisions,
	// and nothing else. Each decision owns `/scenario/[slug]`, including the one
	// this page used to render inline, so no page has two URLs.
	let { today }: { today?: string } = $props();

	const marker = $derived(todayMarker(today));
	const series = recordSeries();
	const longDate = (iso: string) =>
		new Date(`${iso}T00:00:00Z`).toLocaleString('en-US', {
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		});
	const recordOn = (iso: string) => {
		let found: (typeof series)[number] | null = null;
		for (const point of series) {
			if (point.date > iso) break;
			found = point;
		}
		return found;
	};
	const decisions = storylineRegistry
		.map((story: Storyline, index) => {
			const point = recordOn(story.eventDate);
			return {
				story,
				number: index + 1,
				record: point ? `${point.wins}–${point.losses}` : 'preseason',
				href: resolve('/scenario/[slug]', { slug: story.slug })
			};
		})
		.sort((left, right) => left.story.eventDate.localeCompare(right.story.eventDate))
		.map((entry, index) => ({ ...entry, number: index + 1 }));
</script>

<svelte:head>
	<title>Roster Shapes · The 2026 Red Sox season</title>
	<meta
		name="description"
		content="Five dated roster decisions from the 2026 Red Sox season on one timeline, each with its case, engine numbers, and data snapshot."
	/>
</svelte:head>

<div class="index">
	<header class="lead">
		<p class="eyebrow">February 9 → September 25, 2026 · five dated decisions</p>
		<h1>Five roster decisions on one season timeline</h1>
		<p class="lede">
			Boston's 2026 season as games over .500, with each decision pinned to the day it was made.
			Today is <b>{longDate(marker.date)}</b>. Pick a decision to open its case: the roster as a
			fitted set of shapes, the engine's own numbers for the lineup used against the two
			alternatives, and the best lineup that roster could have produced.
		</p>
	</header>

	<SeasonTimeline today={marker.date} />

	<section class="decisions" aria-labelledby="decisions-heading">
		<h2 id="decisions-heading">The decisions</h2>
		<ol class="cards">
			{#each decisions as entry (entry.story.slug)}
				<li>
					<article class="card">
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
								<dd>{entry.story.expected[0]?.offenseRuns ?? 'unavailable'} runs</dd>
							</div>
							{#each entry.story.expected.slice(1) as expectation (expectation.scenarioId)}
								<div>
									<dt>{expectation.scenarioId === 'cand-a' ? 'A' : 'B'}</dt>
									<dd>
										{expectation.offenseRuns ?? 'unavailable'}
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
							{entry.story.rateLabel} rates · illustrative ten-game horizon · pins marked on the timeline
							above
						</p>
					</article>
				</li>
			{/each}
		</ol>
		<p class="note">
			Every number above is an observed public R/PA through that decision's own date, not a
			projection. The engine's totals, the pool's tightest fit, and the coverage and workload checks
			live on each decision's page, with the Jev prompt and its answers one click away under
			Snapshots.
		</p>
	</section>
</div>

<style>
	.index {
		display: grid;
		gap: 2rem;
		max-width: 88rem;
		margin: 0 auto;
		padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem;
	}
	.lead {
		display: grid;
		gap: 0.75rem;
	}
	.eyebrow {
		margin: 0;
		color: var(--ink-soft);
		font: 500 0.75rem var(--mono);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	h1 {
		max-width: 20ch;
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
		font-size: 1.15rem;
		line-height: 1.3;
	}
	h3 a {
		color: var(--ink);
		text-decoration-color: var(--marker);
		text-underline-offset: 3px;
	}
	h3 a:hover {
		color: var(--marker);
	}
	.lede {
		max-width: 70ch;
		margin: 0;
		color: var(--ink-soft);
		font-size: 1rem;
		line-height: 1.6;
	}
	.lede b {
		color: var(--marker);
	}
	.decisions {
		display: grid;
		gap: 1.25rem;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.card {
		display: grid;
		gap: 0.6rem;
		height: 100%;
		border: 1px solid var(--rule);
		border-radius: 12px;
		padding: 1.1rem 1.25rem 1.25rem;
		background: var(--panel);
		box-shadow:
			0 1px 2px rgb(22 32 42 / 6%),
			0 8px 20px rgb(22 32 42 / 6%);
	}
	.card-topline {
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
	}
	.num {
		color: var(--accent-dark);
		font: 600 1.1rem var(--mono);
	}
	.when {
		color: var(--ink-soft);
		font: 400 0.75rem var(--mono);
		letter-spacing: 0.03em;
	}
	.question {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.55;
	}
	.numbers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.5rem;
		margin: 0.25rem 0 0;
	}
	dt {
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	dd {
		margin: 0.1rem 0 0;
		font: 600 0.95rem var(--mono);
	}
	.delta {
		display: block;
		color: var(--ink-soft);
		font-size: 0.75rem;
	}
	.meta,
	.note {
		margin: 0;
		color: var(--ink-soft);
		font: 400 0.78rem var(--mono);
		line-height: 1.6;
	}
	.note {
		max-width: 90ch;
		border-top: 1px solid var(--rule);
		padding-top: 1rem;
		font-family: var(--body);
		font-size: 0.85rem;
	}
</style>
