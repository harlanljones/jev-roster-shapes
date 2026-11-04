<script lang="ts">
	import { page } from '$app/state';
	import { error } from '@sveltejs/kit';
	import DiagramPage from '$lib/app/DiagramPage.svelte';
	import { DIAGRAMS, type DiagramKey } from '$lib/app/decision';
	import { getStoryline } from '$lib/storylines/registry';

	// D-63: the case, engine fit, interactions and slot-by-slot diagrams as tabs of one
	// page, selected by `?view=` and defaulting to the case.
	let { params }: { params: { slug: string } } = $props();
	const story = $derived.by(() => {
		const found = getStoryline(params.slug);
		if (!found) error(404, 'Decision not found');
		return found;
	});
	const view = $derived.by((): DiagramKey => {
		const asked = page.url.searchParams.get('view');
		return DIAGRAMS.find((d) => d.key === asked)?.key ?? 'case';
	});
</script>

<DiagramPage {story} diagram={view} />
