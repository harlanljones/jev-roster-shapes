<script lang="ts">
	import type { Bundle } from '$lib/contracts';
	import { calculateComparison } from '$lib/engine';
	import { storylineRegistry } from '$lib/storylines/registry';
	import RosterShapesGraphic from './RosterShapesGraphic.svelte';

	let { onOpen }: { onOpen: (bundle: Bundle) => void } = $props();

	const SHORT_TITLES: Record<string, string> = {
		'power-vacuum': 'Power vacuum',
		'outfield-logjam': 'Outfield logjam',
		'infield-reset': 'Infield reset',
		'catcher-split': 'Catcher split',
		'lefty-hole': 'Lefty hole'
	};

	let selectedSlug = $state(storylineRegistry[0]?.slug ?? '');
	let selectedPlayerId = $state<string | null>(null);
	let ackedSlugs = $state<string[]>([]);
	let pendingSlug = $state<string | null>(null);

	const selected = $derived(
		storylineRegistry.find((storyline) => storyline.slug === selectedSlug) ?? storylineRegistry[0]
	);

	function selectStoryline(slug: string): void {
		selectedSlug = slug;
		selectedPlayerId = null;
		pendingSlug = null;
	}

	function requestOpen(slug: string): void {
		if (ackedSlugs.includes(slug)) {
			const storyline = storylineRegistry.find((candidate) => candidate.slug === slug);
			if (storyline) onOpen(storyline.bundle);
			return;
		}
		pendingSlug = slug;
	}

	function confirmOpen(slug: string): void {
		const storyline = storylineRegistry.find((candidate) => candidate.slug === slug);
		if (!storyline) return;
		ackedSlugs = [...ackedSlugs, slug];
		pendingSlug = null;
		onOpen(storyline.bundle);
	}

	function declineOpen(): void {
		pendingSlug = null;
	}

	function twoDecimals(value: string | null): string {
		if (value === null) return 'Unavailable';
		return Number(value).toFixed(2);
	}

	function deltaChip(delta: string | null): string {
		if (delta === null) return 'delta unavailable';
		const numeric = Number(delta);
		const sign = numeric > 0 ? '+' : '';
		return `Δ ${sign}${numeric.toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Roster Shapes · 2026 Red Sox storylines</title>
	<meta
		name="description"
		content="An interactive roster-and-shapes graphic plus five reproducible 2026 Red Sox comparison storylines built from cited public data."
	/>
</svelte:head>

<div class="library">
	<header class="hero">
		<div>
			<p class="eyebrow">Roster Shapes · 2026 Boston Red Sox · public observed data</p>
			<h1>Five 2026 storylines, one roster of shapes</h1>
			<p class="lede">
				Start with the roster: every position lane shows its shape, its player, and its workload.
				Shapes are analyst-labeled profile summaries — they never change a calculation. Then open a
				storyline to compare a baseline against two candidates under the same explicit assumptions.
			</p>
			<p class="data-class-banner" data-class="public">
				<strong>Public data</strong> — observed 2026 public values through September 20, not team-approved
				projections. Splits unavailable; horizon and caps illustrative.
			</p>
		</div>
	</header>

	<section class="library-section" aria-labelledby="roster-heading">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Interactive graphic</p>
				<h2 id="roster-heading">The roster and its shapes</h2>
			</div>
		</div>
		<div class="storyline-picker" role="group" aria-label="Choose the storyline roster">
			{#each storylineRegistry as storyline (storyline.slug)}
				<button
					type="button"
					class="picker-button"
					aria-pressed={storyline.slug === selectedSlug}
					onclick={() => selectStoryline(storyline.slug)}
				>
					{SHORT_TITLES[storyline.slug] ?? storyline.slug}
				</button>
			{/each}
		</div>
		{#if selected}
			<p class="picked-title">{selected.title} — baseline roster</p>
			<RosterShapesGraphic
				bundle={selected.bundle}
				{selectedPlayerId}
				onSelect={(playerId: string | null) => (selectedPlayerId = playerId)}
			/>
		{/if}
	</section>

	<section class="library-section" aria-labelledby="storylines-heading">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Comparison library</p>
				<h2 id="storylines-heading">Five comparisons from this season</h2>
			</div>
			<span class="section-note">Baseline plus two candidates · shared assumptions</span>
		</div>
		<div class="storyline-grid">
			{#each storylineRegistry as storyline, index (storyline.slug)}
				{@const calculation = calculateComparison(storyline.bundle)}
				{@const runs = new Map(
					calculation.results.map((result) => [result.scenarioId, result.offense.runs])
				)}
				{@const deltas = new Map(
					calculation.offenseDeltas.map((delta) => [delta.scenarioId, delta.runs])
				)}
				<article class="storyline-card" aria-labelledby="storyline-{storyline.slug}">
					<p class="eyebrow">Storyline {index + 1} · {storyline.date}</p>
					<h3 id="storyline-{storyline.slug}">{storyline.title}</h3>
					<p class="card-timeline">{storyline.timeline}</p>
					<p class="card-description">{storyline.description}</p>
					<p class="card-lede">{storyline.lede}</p>
					<dl class="card-chips">
						<div>
							<dt>Baseline</dt>
							<dd>{twoDecimals(runs.get('base') ?? null)} runs</dd>
						</div>
						<div>
							<dt>Candidate A</dt>
							<dd>
								{twoDecimals(runs.get('cand-a') ?? null)} runs · {deltaChip(
									deltas.get('cand-a') ?? null
								)}
							</dd>
						</div>
						<div>
							<dt>Candidate B</dt>
							<dd>
								{twoDecimals(runs.get('cand-b') ?? null)}{runs.get('cand-b') === null
									? ' — no 2026 rate'
									: ` runs · ${deltaChip(deltas.get('cand-b') ?? null)}`}
							</dd>
						</div>
					</dl>
					<p class="card-source">
						{storyline.sourceLabel} · observed 2026 values through September 20 · {storyline.inputDigest.slice(
							0,
							12
						)}… · splits unavailable · illustrative 10-game horizon
					</p>
					{#if pendingSlug === storyline.slug}
						<div class="ack-box" role="group" aria-label="Public data acknowledgment">
							<p>
								This bundle uses public data — observed public values, not team-approved
								projections. Open it for local review?
							</p>
							<div class="ack-actions">
								<button
									class="primary-button"
									type="button"
									onclick={() => confirmOpen(storyline.slug)}
								>
									Open public bundle
								</button>
								<button class="secondary-button" type="button" onclick={declineOpen}>
									Keep browsing
								</button>
							</div>
						</div>
					{:else}
						<button
							class="primary-button"
							type="button"
							aria-label="Open storyline: {SHORT_TITLES[storyline.slug] ?? storyline.slug}"
							onclick={() => requestOpen(storyline.slug)}
						>
							Open this storyline
						</button>
					{/if}
				</article>
			{/each}
		</div>
	</section>
</div>

<style>
	:global(:root) {
		--ink: #252522;
		--muted: #5f5d56;
		--line: #dedbd1;
		--line-strong: #c8c4b8;
		--paper: #f6f4ee;
		--paper-light: #fffef9;
		--paper-deep: #ebe8df;
		--panel: #fffef9;
		--rust: #9c4a2e;
		--rust-dark: #813a27;
		--sage: #596f58;
		--navy: #2d4555;
	}

	:global(body) {
		background: var(--paper);
	}

	.library {
		min-height: 100vh;
		padding: 3rem clamp(1rem, 4vw, 4rem) 5rem;
		color: var(--ink);
		background:
			radial-gradient(circle at 90% 0%, rgb(168 79 50 / 8%), transparent 30rem), var(--paper);
	}
	.hero,
	.library-section {
		max-width: 78rem;
		margin-inline: auto;
	}
	.hero {
		margin-bottom: 2rem;
	}
	.hero h1 {
		max-width: 46rem;
		margin: 0 0 0.7rem;
		font-family: Georgia, serif;
		font-size: clamp(2.25rem, 5vw, 4.5rem);
		font-weight: 500;
		letter-spacing: -0.055em;
		line-height: 0.98;
	}
	.lede {
		max-width: 43rem;
		margin: 0;
		color: var(--muted);
		font-size: 1.04rem;
		line-height: 1.55;
	}
	.data-class-banner {
		max-width: 43rem;
		margin: 0.8rem 0 0;
		border: 1px solid var(--navy);
		border-radius: 0.75rem;
		padding: 0.6rem 0.85rem;
		color: var(--muted);
		background: rgb(255 254 249 / 70%);
		font-size: 0.82rem;
	}
	.eyebrow {
		margin: 0 0 0.5rem;
		color: var(--rust);
		font-size: 0.7rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.library-section {
		margin-bottom: 3.2rem;
	}
	.section-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.1rem;
	}
	.section-heading h2 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: clamp(1.65rem, 3vw, 2.45rem);
		font-weight: 500;
		letter-spacing: -0.04em;
	}
	.section-note {
		color: var(--muted);
		font-size: 0.75rem;
	}
	.storyline-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.picker-button {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.55rem 0.9rem;
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 700;
	}
	.picker-button[aria-pressed='true'] {
		border-color: var(--rust-dark);
		color: #fffaf2;
		background: var(--rust);
	}
	.picked-title {
		margin: 0 0 1rem;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.storyline-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
		gap: 1rem;
	}
	.storyline-card {
		display: grid;
		gap: 0.6rem;
		align-content: start;
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1.25rem;
		background: var(--panel);
		box-shadow: 0 14px 34px rgb(56 46 31 / 8%);
	}
	.storyline-card h3 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: 1.45rem;
		font-weight: 500;
		letter-spacing: -0.02em;
	}
	.card-lede {
		margin: 0;
		color: var(--muted);
		font-size: 0.86rem;
		line-height: 1.5;
	}
	.card-timeline {
		margin: -0.2rem 0 0;
		color: var(--rust-dark);
		font-size: 0.76rem;
		font-weight: 750;
	}
	.card-description {
		margin: 0;
		color: var(--ink);
		font-size: 0.86rem;
		font-weight: 750;
		line-height: 1.4;
	}
	.card-chips {
		display: grid;
		gap: 0.35rem;
		margin: 0;
	}
	.card-chips div {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		border-top: 1px dashed var(--line);
		padding-top: 0.35rem;
		font-size: 0.8rem;
	}
	.card-chips dt {
		color: var(--muted);
	}
	.card-chips dd {
		margin: 0;
		font-weight: 700;
		text-align: right;
	}
	.card-source {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
	}
	.ack-box {
		display: grid;
		gap: 0.6rem;
		border: 1px solid var(--navy);
		border-radius: 0.75rem;
		padding: 0.75rem;
		background: rgb(45 69 85 / 6%);
		font-size: 0.82rem;
	}
	.ack-box p {
		margin: 0;
	}
	.ack-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.primary-button,
	.secondary-button {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.7rem 1rem;
		cursor: pointer;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 700;
	}
	.primary-button {
		border-color: var(--rust-dark);
		color: #fffaf2;
		background: var(--rust);
	}
	.secondary-button {
		color: var(--ink);
		background: transparent;
	}
	button:focus-visible {
		outline: 3px solid rgb(168 79 50 / 30%);
		outline-offset: 3px;
	}
	@media (max-width: 850px) {
		.section-heading {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
