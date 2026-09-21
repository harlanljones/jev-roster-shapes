<script lang="ts">
	import { error } from '@sveltejs/kit';
	import type { Bundle } from '$lib/contracts';
	import HomePage from '$lib/app/HomePage.svelte';
	import LibraryPage from '$lib/app/LibraryPage.svelte';
	import { getStoryline } from '$lib/storylines/registry';

	let { params }: { params: { slug: string } } = $props();
	const storyline = $derived.by(() => {
		const found = getStoryline(params.slug);
		if (!found) error(404, 'Scenario not found');
		return found;
	});
	let openedBundle = $state<Bundle | null>(null);
</script>

{#if openedBundle}
	<HomePage initialBundle={openedBundle} onBack={() => (openedBundle = null)} />
{:else}
	<LibraryPage
		activeSlug={storyline.slug}
		onOpen={(bundle: Bundle) => (openedBundle = $state.snapshot(bundle))}
	/>
{/if}
