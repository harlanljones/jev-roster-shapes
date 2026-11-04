<script lang="ts">
	import { error } from '@sveltejs/kit';
	import SnapshotsPage from '$lib/app/SnapshotsPage.svelte';
	import { getStoryline } from '$lib/storylines/registry';

	// The snapshots subpage of one decision (D-46): the Jev prompt and its
	// answers beside the roster they describe.
	let { params }: { params: { slug: string } } = $props();
	const story = $derived.by(() => {
		const found = getStoryline(params.slug);
		if (!found) error(404, 'Scenario not found');
		return found;
	});
</script>

<SnapshotsPage {story} />
