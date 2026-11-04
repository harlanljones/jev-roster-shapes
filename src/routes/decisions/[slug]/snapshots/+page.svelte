<script lang="ts">
	import SnapshotsPage from '$lib/app/SnapshotsPage.svelte';
	import type { PageProps } from './$types';

	// The snapshots subpage of one decision (D-46): the Jev prompt and its
	// answers beside the roster they describe.
	let { data }: PageProps = $props();
	const story = $derived(data.storyline);
</script>

<SnapshotsPage {story} />
