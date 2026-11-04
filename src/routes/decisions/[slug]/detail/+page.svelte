<script lang="ts">
	import { page } from '$app/state';
	import DiagramPage from '$lib/app/DiagramPage.svelte';
	import { DIAGRAMS, type DiagramKey } from '$lib/app/decision';
	import type { PageProps } from './$types';

	// D-63: the case, engine fit, interactions and slot-by-slot diagrams as tabs of one
	// page, selected by `?view=` and defaulting to the case.
	let { data }: PageProps = $props();
	const story = $derived(data.storyline);
	const view = $derived.by((): DiagramKey => {
		const asked = page.url.searchParams.get('view');
		return DIAGRAMS.find((d) => d.key === asked)?.key ?? 'case';
	});
</script>

<DiagramPage {story} diagram={view} />
