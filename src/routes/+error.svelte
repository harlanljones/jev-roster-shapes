<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ProsePage from '$lib/app/ProsePage.svelte';
	import { todayIso } from '$lib/app/season-timeline';
	import { currentSlug } from '$lib/storylines/registry';

	// D-62: a branded, helpful error page instead of the host's default.
	const missing = $derived(page.status === 404);
	const current = currentSlug(todayIso());
</script>

<svelte:head>
	<title>{missing ? 'Page not found' : 'Something went wrong'} · Roster Shapes</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<ProsePage
	title={missing ? 'This cutout is empty' : 'Something went wrong'}
	lead={missing
		? 'Error 404: nothing lives at this address. The decision or player may have moved when the site was reorganised.'
		: `Error ${page.status}: ${page.error?.message ?? 'the page could not be shown.'}`}
>
	<ul class="ways">
		<li><a href={resolve('/decisions/[slug]', { slug: current })}>Open the current decision</a></li>
		<li><a href={resolve('/decisions')}>See all eight decisions</a></li>
	</ul>
</ProsePage>

<style>
	.ways {
		padding-left: var(--spacing-300);
	}
</style>
