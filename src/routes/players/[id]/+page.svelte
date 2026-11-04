<script lang="ts">
	import { resolve } from '$app/paths';
	import Piece from '$lib/app/diagrams/Piece.svelte';
	import { headshotUrl } from '$lib/app/headshot';
	import { caseRadius, splitText } from '$lib/app/shape-case';
	import { todayIso } from '$lib/app/season-timeline';
	import { currentSlug } from '$lib/storylines/registry';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const player = $derived(data.player);
	const r = $derived(Math.min(caseRadius(player), 70));
</script>

<svelte:head>
	<title>{player.name} · Roster Shapes</title>
	<meta name="description" content="Roster Shapes player profile for {player.name}." />
</svelte:head>

<div class="player-page">
	<a class="back-link" href={resolve('/decisions/[slug]', { slug: currentSlug(todayIso()) })}
		>← Back to the current decision</a
	>
	<section class="profile" aria-labelledby="player-name">
		<div class="profile-mark">
			<svg viewBox="0 0 220 220" role="img" aria-label="{player.name} as a {player.shape} piece">
				<defs>
					<pattern
						id="player-hatch"
						width="7"
						height="7"
						patternUnits="userSpaceOnUse"
						patternTransform="rotate(45)"
					>
						<rect width="7" height="7" fill="var(--foam-deep)" />
						<line x1="0" y1="0" x2="0" y2="7" stroke="var(--foam-edge)" stroke-width="2" />
					</pattern>
				</defs>
				<rect width="220" height="220" rx="4" fill="var(--foam)" />
				<Piece {player} cx={110} cy={110} {r} hatch="player-hatch" />
			</svg>
			<img src={headshotUrl(player.id)} alt={player.name} width="96" height="96" />
		</div>
		<div class="profile-copy">
			<h1 id="player-name" class="page-title">{player.name}</h1>
			<p class="chip">{player.shape}</p>
			<p class="rationale">{player.rationale}</p>
			<dl>
				<div>
					<dt>Bats</dt>
					<dd>{player.bats}</dd>
				</div>
				<div>
					<dt>Eligible</dt>
					<dd>{player.elig.join(', ') || 'DH / no fielding eligibility'}</dd>
				</div>
				<div>
					<dt>Observed R/PA</dt>
					<dd>{player.rateText ?? 'Unavailable'}</dd>
				</div>
				<div>
					<dt>Split OPS</dt>
					<dd>{splitText(player)}</dd>
				</div>
				<div>
					<dt>Actual 2026 runs</dt>
					<dd>{player.runs == null ? 'Unavailable' : player.runs.toFixed(1)}</dd>
				</div>
			</dl>
			<p class="boundary">
				Shape is an assumption layer profile mark. It does not create coverage, change workload, or
				determine value. Piece size and halves are a display layer over actual 2026 production.
			</p>
		</div>
	</section>
</div>

<style>
	.player-page {
		max-width: 72rem;
		margin: 0 auto;
		padding: var(--spacing-400) var(--spacing-300) var(--spacing-800);
	}
	.back-link {
		color: var(--turf);
		font-weight: 600;
		text-decoration: none;
	}
	.profile {
		display: grid;
		grid-template-columns: minmax(14rem, 20rem) 1fr;
		gap: var(--spacing-500);
		align-items: center;
		margin-top: var(--spacing-400);
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-400);
		background: var(--case-100);
	}
	.profile-mark {
		display: grid;
		gap: var(--spacing-200);
		justify-items: center;
	}
	.profile-mark svg {
		width: 100%;
		height: auto;
	}
	.profile-mark img {
		width: 6rem;
		height: 6rem;
		border-radius: 50%;
		object-fit: cover;
		background: var(--case-200);
	}
	h1 {
		margin: 0;
	}
	.chip {
		display: inline-block;
		margin: var(--spacing-100) 0 0;
		border-radius: var(--radius-md);
		padding: var(--spacing-25) var(--spacing-75);
		background: var(--case-200);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		letter-spacing: 0.02em;
	}
	.rationale {
		max-width: 38rem;
		color: var(--ink-muted);
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
	}
	dl {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-200) var(--spacing-400);
		margin: var(--spacing-300) 0;
	}
	dt {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	dd {
		margin: var(--spacing-25) 0 0;
		font-family: var(--font-mono);
		font-weight: 600;
	}
	.boundary {
		max-width: 40rem;
		border-top: 1px solid var(--case-300);
		padding-top: var(--spacing-200);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	@media (max-width: 650px) {
		.profile {
			grid-template-columns: 1fr;
			gap: var(--spacing-300);
		}
	}
</style>
