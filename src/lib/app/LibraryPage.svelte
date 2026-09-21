<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { Bundle } from '$lib/contracts';
	import { storylineRegistry } from '$lib/storylines/registry';
	import RosterShapesGraphic from './RosterShapesGraphic.svelte';
	import LiveRosterRender from './LiveRosterRender.svelte';

	let {
		activeSlug = storylineRegistry[0]?.slug ?? '',
		onOpen
	}: { activeSlug?: string; onOpen: (bundle: Bundle) => void } = $props();

	const SHORT_TITLES: Record<string, string> = {
		'power-vacuum': 'Power vacuum',
		'outfield-logjam': 'Outfield logjam',
		'infield-reset': 'Infield reset',
		'catcher-split': 'Catcher split',
		'lefty-hole': 'Lefty hole'
	};
	let selectedPlayerId = $state<string | null>(null);
	let pendingOpen = $state(false);
	const selected = $derived(
		storylineRegistry.find((storyline) => storyline.slug === activeSlug) ?? storylineRegistry[0]
	);

	function openWorkspace(): void {
		if (selected) onOpen(selected.bundle);
	}
</script>

<svelte:head>
	<title>{selected?.title ?? 'Roster Shapes'} · Roster Shapes</title>
	<meta
		name="description"
		content="A shape-first visual model of the 2026 Red Sox roster and its decision scenarios."
	/>
</svelte:head>

<div class="library">
	<header class="hero">
		<p class="eyebrow">Roster Shapes · 2026 Boston Red Sox · public observed data</p>
		<h1>One roster. Five ways to see the shape.</h1>
		<p class="lede">
			The roster is the product surface: every player is a shape with a readable role, workload, and
			profile. Scenario navigation changes the same visual roster below.
		</p>
		<p class="data-class-banner">
			<strong>Public data</strong> · observed 2026 values through September 20, not team-approved projections.
			Splits unavailable; horizon and caps illustrative.
		</p>
	</header>

	<nav class="scenario-nav" aria-label="Choose scenario">
		{#each storylineRegistry as storyline (storyline.slug)}
			<a
				class="scenario-link"
				class:active={storyline.slug === activeSlug}
				aria-current={storyline.slug === activeSlug ? 'page' : undefined}
				href={storyline.slug === storylineRegistry[0]?.slug
					? resolve('/')
					: resolve('/scenario/[slug]', { slug: storyline.slug })}
			>
				<span>{SHORT_TITLES[storyline.slug] ?? storyline.slug}</span>
				<small>{storyline.date}</small>
			</a>
		{/each}
	</nav>

	{#if selected}
		<section class="scenario-heading" aria-labelledby="scenario-title">
			<div>
				<p class="eyebrow">
					{selected.retrospective ? 'Retrospective analysis' : 'Scenario'} · {selected.date}
				</p>
				<h2 id="scenario-title">{selected.title}</h2>
				<p>{selected.description} {selected.eventBasis}</p>
				<p class="scenario-source">{selected.sourceLabel}</p>
				<p class="scenario-source">{selected.sourceLabel}</p>
			</div>
			<button class="primary-button" type="button" onclick={() => (pendingOpen = true)}
				>Open workspace</button
			>
		</section>
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
		<LiveRosterRender
			bundle={selected.bundle}
			activeScenarioId={selected.bundle.comparison.baseline.id}
			onSelect={(playerId: string) =>
				void goto(resolve('/player/[id]', { id: playerId.slice('mlbam-'.length) }))}
		/>
		<RosterShapesGraphic
			bundle={selected.bundle}
			{selectedPlayerId}
			onSelect={(playerId: string | null) => (selectedPlayerId = playerId)}
		/>
	{/if}
</div>

<style>
	:global(:root) {
		--ink: #252522;
		--muted: #5f5d56;
		--line: #dedbd1;
		--paper: #f6f4ee;
		--panel: #fffef9;
		--rust: #9c4a2e;
		--rust-dark: #813a27;
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
	.scenario-nav,
	.scenario-heading,
	.ack-box,
	:global(.graphic-block) {
		max-width: 78rem;
		margin-inline: auto;
	}
	.hero {
		margin-bottom: 1.5rem;
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
	.eyebrow {
		margin: 0 0 0.5rem;
		color: var(--rust);
		font-size: 0.7rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.lede {
		max-width: 45rem;
		margin: 0;
		color: var(--muted);
		font-size: 1.04rem;
		line-height: 1.55;
	}
	.data-class-banner {
		max-width: 45rem;
		margin: 0.8rem 0 0;
		border: 1px solid var(--navy);
		border-radius: 0.75rem;
		padding: 0.6rem 0.85rem;
		color: var(--muted);
		background: rgb(255 254 249 / 70%);
		font-size: 0.82rem;
	}
	.scenario-nav {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
		margin-bottom: 1.2rem;
	}
	.scenario-link {
		display: grid;
		gap: 0.25rem;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		padding: 0.7rem;
		background: var(--panel);
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		text-align: left;
		text-decoration: none;
	}
	.scenario-link span {
		font-size: 0.8rem;
		font-weight: 800;
	}
	.scenario-link small {
		color: var(--muted);
		font-size: 0.67rem;
	}
	.scenario-link.active {
		border-color: var(--rust-dark);
		color: #fffaf2;
		background: var(--rust);
	}
	.scenario-link.active small {
		color: #f8ded1;
	}
	.scenario-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.scenario-heading h2 {
		margin: 0.1rem 0 0.3rem;
		font-family: Georgia, serif;
		font-size: clamp(1.7rem, 3vw, 2.5rem);
		font-weight: 500;
		letter-spacing: -0.04em;
	}
	.scenario-heading p:last-child {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
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
		white-space: nowrap;
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
	.ack-box {
		display: grid;
		gap: 0.6rem;
		margin-bottom: 1rem;
		border: 1px solid var(--navy);
		border-radius: 0.75rem;
		padding: 0.85rem;
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
	button:focus-visible {
		outline: 3px solid rgb(168 79 50 / 30%);
		outline-offset: 3px;
	}
	@media (max-width: 850px) {
		.scenario-nav {
			grid-template-columns: repeat(2, 1fr);
		}
		.scenario-heading {
			align-items: flex-start;
			flex-direction: column;
		}
	}
	@media (max-width: 520px) {
		.scenario-nav {
			grid-template-columns: 1fr;
		}
	}
</style>
