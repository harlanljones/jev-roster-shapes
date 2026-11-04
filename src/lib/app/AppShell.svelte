<script lang="ts">
	import '@fontsource/geist-sans/latin-400.css';
	import '@fontsource/geist-sans/latin-500.css';
	import '@fontsource/geist-sans/latin-600.css';
	import '@fontsource/geist-mono/latin-400.css';
	import '@fontsource/geist-mono/latin-500.css';
	import '@fontsource/geist-mono/latin-600.css';
	import '$lib/ui/tokens.css';
	import '$lib/ui/base.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import type { Storyline } from '$lib/storylines/registry';
	import { resolve } from '$app/paths';

	let { children }: { children: Snippet } = $props();

	// D-63: the shell names where you are — the overview, the season index, the open decision,
	// and how to read a board. The decision's own places live in its DecisionNav. D-65: it is a
	// plain top bar, with the phone menu a plain list under it.
	// The open decision comes from the decision routes' own load (decisions/[slug]/+layout.ts), so
	// the shell itself never pulls in the storyline registry; /privacy, /terms and the like
	// load without it.
	const story = $derived(page.data.storyline as Storyline | undefined);
	const route = $derived(page.route.id ?? '');
	const here = $derived({
		overview: route === '/',
		decisions: route === '/decisions',
		// The decision link points at the board: it is the page only there, and marks the
		// current section (aria-current="true") on the board's subpages.
		decision:
			route === '/decisions/[slug]'
				? ('page' as const)
				: route.startsWith('/decisions/[slug]/')
					? ('true' as const)
					: undefined,
		method: route === '/method'
	});

	let menuOpen = $state(false);
	let toggle = $state<HTMLButtonElement>();

	function closeMenu(returnFocus = false): void {
		if (!menuOpen) return;
		menuOpen = false;
		if (returnFocus) toggle?.focus();
	}

	afterNavigate(() => closeMenu());
</script>

<svelte:window
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Escape') closeMenu(true);
	}}
	onresize={() => {
		if (window.innerWidth > 720) closeMenu();
	}}
/>

<a class="skip-link" href="#main">Skip to content</a>

<header class="shell">
	<div class="bar">
		<a class="wordmark" href={resolve('/')} aria-current={here.overview ? 'page' : undefined}
			>Roster Shapes</a
		>
		<nav class="links" aria-label="Sections">
			<a href={resolve('/decisions')} aria-current={here.decisions ? 'page' : undefined}
				>Decisions</a
			>
			{#if story}
				<a href={resolve('/decisions/[slug]', { slug: story.slug })} aria-current={here.decision}
					>{story.short}</a
				>
			{/if}
			<a href={resolve('/method')} aria-current={here.method ? 'page' : undefined}>How to read it</a
			>
		</nav>
		<button
			bind:this={toggle}
			class="toggle"
			type="button"
			aria-expanded={menuOpen}
			aria-controls="site-menu"
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span class="visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
			<span class="toggle-lines" aria-hidden="true"><span></span><span></span></span>
		</button>
	</div>
	<nav id="site-menu" class="menu" aria-label="Menu" hidden={!menuOpen}>
		<ul>
			<li><a href={resolve('/')}>Overview</a></li>
			<li><a href={resolve('/decisions')}>Decisions</a></li>
			{#if story}
				<li>
					<a href={resolve('/decisions/[slug]', { slug: story.slug })}>{story.short}</a>
				</li>
			{/if}
			<li><a href={resolve('/method')}>How to read it</a></li>
		</ul>
	</nav>
</header>

<!-- While the phone menu is open it is the only thing to use, so the page leaves the focus order. -->
<main id="main" tabindex="-1" inert={menuOpen}>
	{@render children()}
</main>

<footer class="site-footer" inert={menuOpen}>
	<div class="footer-inner">
		<p class="credit">
			Roster Shapes adapts the roster shapes framework created by Taylor Wyman (<a
				href="https://www.tiktok.com/@taylormetrics">@taylormetrics</a
			>). The baseball translation, the eight shape rubric and every number here are this project's
			own, not his encoding, and he has no involvement in this project.
			<a href={resolve('/method')}>Credits and method</a>
		</p>
		<p class="meta">2026 Red Sox · position players · public observed data · MIT licensed</p>
		<ul class="legal">
			<li><a href={resolve('/privacy')}>Privacy</a></li>
			<li><a href={resolve('/terms')}>Terms</a></li>
			<li>
				<a class="source" href="https://github.com/harlanljones/jev-roster-shapes"
					><Icon name="github-logo" size={16} />Source</a
				>
			</li>
		</ul>
	</div>
</footer>

<style>
	.skip-link {
		position: absolute;
		left: var(--spacing-200);
		top: calc(-1 * var(--spacing-800));
		z-index: var(--z-menu);
		padding: var(--spacing-75) var(--spacing-100);
		border-radius: var(--radius-md);
		color: var(--case-100);
		background: var(--ink);
		font-weight: 600;
	}
	.skip-link:focus {
		top: var(--spacing-200);
	}

	/* A plain top bar across the page (D-65): a hairline under it, no float, blur or shadow. */
	.shell {
		border-bottom: 1px solid var(--case-300);
		background: var(--case-000);
	}
	.bar {
		display: flex;
		align-items: center;
		gap: var(--spacing-300);
		max-width: var(--page-max);
		margin: 0 auto;
		padding: var(--spacing-100) var(--spacing-300);
	}
	.wordmark {
		color: var(--ink);
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
	}
	.links {
		display: flex;
		gap: var(--spacing-200);
	}
	.links a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
	}
	.links a:hover {
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 6px;
	}
	/* Current differs from hover: the turf underline marks where you are. */
	.links a[aria-current] {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--turf);
		text-decoration-thickness: 2px;
		text-underline-offset: 6px;
	}

	.toggle {
		display: none;
		width: 44px;
		height: 44px;
		margin-left: auto;
		padding: 0;
		border: 1px solid var(--case-400);
		border-radius: var(--radius-sm);
		color: var(--ink);
		background: var(--case-100);
		cursor: pointer;
	}
	.toggle-lines {
		position: relative;
		display: block;
		width: 18px;
		height: 12px;
		margin: 0 auto;
	}
	.toggle-lines span {
		position: absolute;
		left: 0;
		width: 100%;
		height: 2px;
		background: currentColor;
	}
	.toggle-lines span:first-child {
		top: 0;
	}
	.toggle-lines span:last-child {
		bottom: 0;
	}

	/* Phone menu: a plain list under the bar. */
	.menu {
		border-top: 1px solid var(--case-300);
		border-bottom: 1px solid var(--case-300);
		padding: var(--spacing-200) var(--spacing-300);
	}
	.menu ul {
		display: grid;
		gap: var(--spacing-50);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.menu a {
		display: block;
		padding: var(--spacing-75) 0;
		color: var(--ink);
		font-size: var(--text-lg);
		line-height: var(--text-lg--lh);
		font-weight: 600;
		text-decoration: none;
	}

	@media (max-width: 720px) {
		.links {
			display: none;
		}
		.toggle {
			display: block;
		}
	}

	main {
		display: block;
		min-height: 60vh;
	}
	main:focus {
		outline: none;
	}

	.site-footer {
		margin-top: var(--spacing-900);
		border-top: 1px solid var(--case-300);
	}
	.footer-inner {
		display: grid;
		gap: var(--spacing-200);
		max-width: var(--page-max);
		margin: 0 auto;
		padding: var(--spacing-600) var(--spacing-300) var(--spacing-800);
	}
	.credit {
		max-width: var(--hero-max);
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
	/* Links in running text keep an underline: colour alone cannot mark them here. */
	.credit a {
		color: var(--turf);
		text-decoration: underline;
	}
	.meta {
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.legal {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.legal a {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-75);
		min-height: 44px;
		color: var(--ink);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 500;
		text-decoration: underline;
		text-decoration-color: var(--case-400);
	}
	.legal a:hover {
		text-decoration-color: currentColor;
	}
</style>
