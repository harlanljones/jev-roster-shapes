<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LibraryPage from '$lib/app/LibraryPage.svelte';
	import { acknowledgePublic } from '$lib/app/public-ack';
	import { scenarioQuery } from '$lib/app/routes';
	import type { PageProps } from './$types';

	// D-63: the decision board. Opening the workspace records the D-36 public-data
	// acknowledgment for this session and moves to the workspace's own URL.
	let { data }: PageProps = $props();
	const storyline = $derived(data.storyline);

	function open(): void {
		acknowledgePublic(storyline.bundle.bundleId);
		// The scenario pick rides along, so coming back lands on the same scenario.
		const pick = scenarioQuery(page.url.searchParams.get('scenario'));
		// The path is resolve()d; only the query is appended.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(`${resolve('/decisions/[slug]/compare', { slug: storyline.slug })}${pick}`);
	}
</script>

<LibraryPage activeSlug={storyline.slug} onOpen={open} />
