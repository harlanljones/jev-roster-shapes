<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { error } from '@sveltejs/kit';
	import LibraryPage from '$lib/app/LibraryPage.svelte';
	import { acknowledgePublic } from '$lib/app/public-ack';
	import { getStoryline } from '$lib/storylines/registry';

	// D-63: the decision board. Opening the workspace records the D-36 public-data
	// acknowledgment for this session and moves to the workspace's own URL.
	let { params }: { params: { slug: string } } = $props();
	const storyline = $derived.by(() => {
		const found = getStoryline(params.slug);
		if (!found) error(404, 'Decision not found');
		return found;
	});

	function open(): void {
		acknowledgePublic(storyline.bundle.bundleId);
		void goto(resolve('/decisions/[slug]/compare', { slug: storyline.slug }));
	}
</script>

<LibraryPage activeSlug={storyline.slug} onOpen={open} />
