<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<a class="skip-link" href="#main">Skip to content</a>

<header class="shell-header">
	<p class="product">Roster Shapes</p>
	<p class="data-class"><strong>Synthetic demo data</strong> — invented values, not team data</p>
</header>

<main id="main" tabindex="-1">
	{@render children()}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		line-height: 1.5;
	}

	.skip-link {
		position: absolute;
		left: 1rem;
		top: -3rem;
	}

	.skip-link:focus {
		top: 1rem;
	}

	.shell-header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		align-items: baseline;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid currentColor;
	}

	.shell-header p {
		margin: 0;
	}

	.product {
		font-weight: 700;
	}

	main {
		padding: 0;
		max-width: none;
	}
</style>
