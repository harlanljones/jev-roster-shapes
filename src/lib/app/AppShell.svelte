<script lang="ts">
	import '@fontsource/saira-stencil-one/latin-400.css';
	import '@fontsource/ibm-plex-sans/latin-400.css';
	import '@fontsource/ibm-plex-sans/latin-600.css';
	import '@fontsource/ibm-plex-mono/latin-400.css';
	import '@fontsource/ibm-plex-mono/latin-500.css';
	import '@fontsource/ibm-plex-mono/latin-600.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { getStoryline } from '$lib/storylines/registry';

	let { children }: { children: Snippet } = $props();

	// D-46: the shell names where you are. `snapshots` is a subpage of the
	// decision it explains, so the nav only offers it when a decision is open.
	const slug = $derived(page.params.slug ?? null);
	const story = $derived(slug ? getStoryline(slug) : undefined);
	const onSnapshots = $derived(page.route.id === '/scenario/[slug]/snapshots');
	const decisionHref = $derived(story ? resolve('/scenario/[slug]', { slug: story.slug }) : null);
</script>

<a class="skip-link" href="#main">Skip to content</a>

<header class="shell-header">
	<a class="wordmark" href={resolve('/')}>Roster Shapes</a>
	<nav class="shell-nav" aria-label="Sections">
		<a href={resolve('/')} aria-current={slug ? undefined : 'page'}>Decisions</a>
		{#if story && decisionHref}
			<a href={decisionHref} aria-current={onSnapshots ? undefined : 'page'}>
				{story.short}
			</a>
			<a
				href={resolve('/scenario/[slug]/snapshots', { slug: story.slug })}
				aria-current={onSnapshots ? 'page' : undefined}
			>
				Snapshots
			</a>
		{/if}
	</nav>
	<p class="shell-meta">2026 Red Sox · position players · public observed data</p>
</header>

<main id="main" tabindex="-1">
	{@render children()}
</main>

<style>
	/* One world for the whole app (D-43, DESIGN.md): a cool steel board with a
	   faint grid, white panels, and the dark foam case as the object on it. */
	:global(:root) {
		color-scheme: light;
		--board: #dde3e8;
		--panel: #fbfcfd;
		--ink: #16202a;
		--ink-soft: #4a5663;
		--rule: #c5ced6;
		--rule-strong: #a9b5c0;
		--marker: #1e4fa8;
		--accent: #c8323a;
		--accent-dark: #9e2229;
		--snug: #23794a;
		--fits: #8a5e0e;
		--loose: #b3261e;
		--unknown: #5d6570;
		--chip-bg: #e7ecf0;
		--foam: #2c312f;
		--shell: #191d1c;
		--chalk: #eef0ea;
		--display: 'Saira Stencil One', 'Arial Narrow', sans-serif;
		--body: 'IBM Plex Sans', system-ui, sans-serif;
		--mono: 'IBM Plex Mono', ui-monospace, monospace;

		/* Earlier token names, kept so the workspace panels take the new look. */
		--muted: var(--ink-soft);
		--line: var(--rule);
		--line-strong: var(--rule-strong);
		--paper: var(--panel);
		--paper-light: #fff;
		--paper-deep: var(--chip-bg);
		--rust: var(--loose);
		--rust-dark: var(--accent-dark);
		--rust-soft: #f1c9cb;
		--sage: var(--snug);
		--navy: var(--marker);
		--teal: var(--snug);
	}

	:global(body) {
		margin: 0;
		color: var(--ink);
		background-color: var(--board);
		background-image:
			linear-gradient(rgb(30 79 168 / 7%) 1px, transparent 1px),
			linear-gradient(90deg, rgb(30 79 168 / 7%) 1px, transparent 1px);
		background-size: 32px 32px;
		font-family: var(--body);
		line-height: 1.5;
	}

	:global(:focus-visible) {
		outline: 3px solid var(--marker);
		outline-offset: 3px;
	}

	.skip-link {
		position: absolute;
		left: 1rem;
		top: -3rem;
		z-index: 10;
		padding: 0.5rem 0.75rem;
		color: var(--panel);
		background: var(--ink);
	}

	.skip-link:focus {
		top: 1rem;
	}

	.shell-header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		align-items: baseline;
		max-width: 88rem;
		margin: 0 auto;
		padding: 1.25rem clamp(1rem, 4vw, 3rem);
		border-bottom: 1px solid var(--rule);
	}

	.wordmark {
		color: var(--ink);
		font-family: var(--display);
		font-size: 1.5rem;
		letter-spacing: 0.08em;
		text-decoration: none;
		text-transform: uppercase;
	}

	.shell-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.shell-nav a {
		border: 1px solid transparent;
		border-radius: 6px;
		padding: 0.3rem 0.6rem;
		color: var(--ink-soft);
		font: 500 0.8rem var(--mono);
		letter-spacing: 0.04em;
		text-decoration: none;
		text-transform: uppercase;
	}

	.shell-nav a:hover {
		border-color: var(--rule);
		color: var(--ink);
	}

	.shell-nav a[aria-current='page'] {
		border-color: var(--ink);
		color: var(--panel);
		background: var(--ink);
	}

	.shell-meta {
		margin: 0;
		color: var(--ink-soft);
		font-family: var(--mono);
		font-size: 0.75rem;
	}

	main {
		padding: 0;
		max-width: none;
	}
</style>
