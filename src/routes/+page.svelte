<script lang="ts">
	import DecisionsPage from '$lib/app/DecisionsPage.svelte';

	// D-46: `/` is the season index — the timeline with today marked, and the
	// five dated decisions. Opening a decision is a route, not in-page state, so
	// every decision (including the former default) has exactly one URL.
</script>

<DecisionsPage />
