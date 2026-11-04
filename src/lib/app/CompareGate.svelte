<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Storyline } from '$lib/storylines/registry';
	import { scenarioQuery } from './routes';

	// D-36 and D-63: the public-data acknowledgment, shown when the workspace URL is visited
	// directly without one recorded for this session.
	let {
		story,
		scenarioId = null,
		onAccept
	}: { story: Storyline; scenarioId?: string | null; onAccept: () => void } = $props();
</script>

<svelte:head>
	<title>Open the workspace · {story.title} · Roster Shapes</title>
</svelte:head>

<section class="gate" aria-labelledby="gate-title">
	<h1 id="gate-title">Open this scenario for local review?</h1>
	<p class="page-lead">
		{story.title} uses observed public values, not team approved projections. Edits stay in this browser
		until you export them.
	</p>
	<div class="ack-box" role="group" aria-label="Public data acknowledgment">
		<button class="button button-primary" type="button" onclick={onAccept}
			>Open public scenario</button
		>
		<a
			class="button button-secondary"
			href="{resolve('/decisions/[slug]', { slug: story.slug })}{scenarioQuery(scenarioId)}"
			>Back to the board</a
		>
	</div>
</section>

<style>
	.gate {
		display: grid;
		gap: var(--spacing-300);
		max-width: var(--hero-max);
		margin: 0 auto;
		padding: var(--spacing-800) var(--spacing-200) var(--spacing-900);
	}
	.gate h1 {
		margin: 0;
		font-size: var(--text-4xl);
		line-height: var(--text-4xl--lh);
		letter-spacing: -0.02em;
	}
	.page-lead {
		margin: 0;
	}
	.ack-box {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-100);
	}
</style>
