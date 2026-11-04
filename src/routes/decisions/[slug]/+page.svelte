<script lang="ts">
	import LibraryPage from '$lib/app/LibraryPage.svelte';
	import type { PageProps } from './$types';

	// D-63: the decision board. Its "Open workspace" link goes to the workspace's own URL, which
	// collects the D-36 public-data acknowledgment.
	let { data }: PageProps = $props();
</script>

<LibraryPage activeSlug={data.storyline.slug} />
