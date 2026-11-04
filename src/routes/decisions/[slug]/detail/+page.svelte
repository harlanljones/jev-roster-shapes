<script lang="ts">
	import { error } from '@sveltejs/kit';
	import DiagramPage from '$lib/app/DiagramPage.svelte';
	import type { DiagramKey } from '$lib/app/decision';
	import { getStoryline } from '$lib/storylines/registry';

	// D-50: a supplementary diagram of one decision.
	let { params }: { params: { slug: string; diagram: DiagramKey } } = $props();
	const story = $derived.by(() => {
		const found = getStoryline(params.slug);
		if (!found) error(404, 'Scenario not found');
		return found;
	});
</script>

<DiagramPage {story} diagram={params.diagram} />
