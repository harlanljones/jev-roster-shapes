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
	// and how to read a board. The decision's own places live in its DecisionNav.
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

	$effect(() => {
		// The open menu owns the screen: lock page scroll behind it.
		document.documentElement.style.overflow = menuOpen ? 'hidden' : '';
		return () => {
			document.documentElement.style.overflow = '';
		};
	});
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

<header class="shell" class:menu-open={menuOpen}>
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
			<li style="--i: 0"><a href={resolve('/')}>Overview</a></li>
			<li style="--i: 1"><a href={resolve('/decisions')}>Decisions</a></li>
			{#if story}
				<li style="--i: 2">
					<a href={resolve('/decisions/[slug]', { slug: story.slug })}>{story.short}</a>
				</li>
			{/if}
			<li style="--i: 3"><a href={resolve('/method')}>How to read it</a></li>
		</ul>
	</nav>
</header>

<!-- The open phone menu covers the page, so what it covers leaves the focus order. -->
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

	/* A compact bar that floats off the top edge, centred and sized to its content, on a
	   translucent surface over a background blur (landing-page-design B7). */
	.shell {
		position: sticky;
		top: var(--spacing-200);
		z-index: var(--z-nav);
		display: flex;
		justify-content: center;
		margin: var(--spacing-200) var(--spacing-200) 0;
		pointer-events: none;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: var(--spacing-300);
		max-width: 100%;
		padding: var(--spacing-50) var(--spacing-50) var(--spacing-50) var(--spacing-300);
		border: 1px solid var(--case-300);
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--case-100) 78%, transparent);
		-webkit-backdrop-filter: blur(16px) saturate(140%);
		backdrop-filter: blur(16px) saturate(140%);
		box-shadow: var(--shadow-pop);
		pointer-events: auto;
	}
	.wordmark {
		color: var(--ink);
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
		font-weight: 600;
		letter-spacing: -0.01em;
		text-decoration: none;
		white-space: nowrap;
	}
	.links {
		display: flex;
		gap: var(--spacing-50);
	}
	.links a {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 var(--spacing-200);
		border-radius: var(--radius-full);
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
	}
	.links a:hover {
		color: var(--ink);
		background: var(--case-200);
	}
	/* Current differs from hover: the turf underline marks where you are. */
	.links a[aria-current] {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--turf);
		text-decoration-thickness: 2px;
		text-underline-offset: 6px;
	}

	/* The menu toggle morphs between two lines and a cross on the base curve. */
	.toggle {
		display: none;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-full);
		color: var(--ink);
		background: transparent;
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
		border-radius: var(--radius-sm);
		background: currentColor;
		transition: transform var(--dur-move) var(--ease);
	}
	.toggle-lines span:first-child {
		top: 0;
	}
	.toggle-lines span:last-child {
		bottom: 0;
	}
	.menu-open .toggle-lines span:first-child {
		transform: translateY(5px) rotate(45deg);
	}
	.menu-open .toggle-lines span:last-child {
		transform: translateY(-5px) rotate(-45deg);
	}

	/* Phone menu: a full-height panel, links arriving in reading order 60ms apart. */
	.menu {
		position: fixed;
		inset: 0;
		z-index: -1;
		padding: calc(var(--spacing-900) + var(--spacing-300)) var(--spacing-300) var(--spacing-600);
		background: color-mix(in srgb, var(--case-000) 94%, transparent);
		-webkit-backdrop-filter: blur(24px);
		backdrop-filter: blur(24px);
		pointer-events: auto;
	}
	.menu ul {
		display: grid;
		gap: var(--spacing-100);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.menu a {
		display: block;
		padding: var(--spacing-100) 0;
		color: var(--ink);
		font-size: var(--text-3xl);
		line-height: var(--text-3xl--lh);
		font-weight: 600;
		letter-spacing: -0.02em;
		text-decoration: none;
	}
	@media (prefers-reduced-motion: no-preference) {
		.menu:not([hidden]) li {
			animation: menu-in var(--dur-move) var(--ease) both;
			animation-delay: min(calc(var(--i) * 60ms), 340ms);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.toggle-lines span {
			transition: none;
		}
		.menu:not([hidden]) li {
			animation: menu-fade var(--dur-fade) var(--ease) both;
		}
	}
	@keyframes menu-in {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes menu-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (max-width: 720px) {
		.links {
			display: none;
		}
		.toggle {
			display: block;
		}
		.bar {
			gap: var(--spacing-200);
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
