<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { error } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import CompareGate from '$lib/app/CompareGate.svelte';
	import HomePage from '$lib/app/HomePage.svelte';
	import { acknowledgePublic, hasAcknowledgedPublic } from '$lib/app/public-ack';
	import { getStoryline } from '$lib/storylines/registry';

	// D-63: the comparison workspace, with its own URL. A direct visit meets the same
	// D-36 acknowledgment the board collects before any scenario opens.
	let { params }: { params: { slug: string } } = $props();
	const storyline = $derived.by(() => {
		const found = getStoryline(params.slug);
		if (!found) error(404, 'Decision not found');
		return found;
	});
	let acknowledged = $state(untrack(() => hasAcknowledgedPublic(storyline.bundle.bundleId)));

	function accept(): void {
		acknowledgePublic(storyline.bundle.bundleId);
		acknowledged = true;
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if acknowledged}
	{#key storyline.slug}
		<HomePage
			initialBundle={storyline.bundle}
			onBack={() => void goto(resolve('/decisions/[slug]', { slug: storyline.slug }))}
		/>
	{/key}
{:else}
	<CompareGate story={storyline} onAccept={accept} />
{/if}
