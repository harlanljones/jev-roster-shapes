<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	// A plain reading page: privacy, terms, and the 404.
	let { title, lead, children }: { title: string; lead?: string; children: Snippet } = $props();
</script>

<article class="prose-page">
	<h1 class="page-title">{title}</h1>
	{#if lead}<p class="page-lead">{lead}</p>{/if}
	<div class="body">
		{@render children()}
	</div>
	<p class="back"><a href={resolve('/')}>Back to the overview</a></p>
</article>

<style>
	.prose-page {
		display: grid;
		gap: var(--spacing-200);
		max-width: var(--hero-max);
		margin: 0 auto;
		padding: var(--spacing-700) var(--spacing-300) 0;
	}
	.page-lead {
		margin: 0;
	}
	.body {
		display: grid;
		gap: var(--spacing-200);
		padding-top: var(--spacing-300);
	}
	.body :global(h2) {
		margin: var(--spacing-300) 0 0;
		font-size: var(--text-xl);
		line-height: var(--text-xl--lh);
	}
	.body :global(p),
	.body :global(ul) {
		margin: 0;
	}
	.body :global(li + li) {
		margin-top: var(--spacing-75);
	}
	.body :global(a) {
		text-decoration: underline;
	}
	.back {
		margin: 0;
		padding-top: var(--spacing-400);
	}
	@media (max-width: 640px) {
		.prose-page {
			padding-inline: var(--spacing-200);
		}
	}
</style>
