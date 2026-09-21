<script lang="ts">
	import type { Bundle } from '$lib/contracts';
	import HomePage from '$lib/app/HomePage.svelte';
	import LibraryPage from '$lib/app/LibraryPage.svelte';

	// Library-first (D-40): the start screen is the roster-and-shapes graphic
	// plus the five storyline cards. A storyline opens in the workspace only
	// after its public-data acknowledgment, which the library collects.
	let openedBundle = $state<Bundle | null>(null);
</script>

{#if openedBundle}
	<HomePage initialBundle={openedBundle} onBack={() => (openedBundle = null)} />
{:else}
	<LibraryPage onOpen={(bundle: Bundle) => (openedBundle = $state.snapshot(bundle))} />
{/if}
