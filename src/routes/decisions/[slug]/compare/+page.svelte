<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CompareGate from '$lib/app/CompareGate.svelte';
	import HomePage from '$lib/app/HomePage.svelte';
	import { acknowledgePublic, hasAcknowledgedPublic } from '$lib/app/public-ack';
	import { scenarioQuery } from '$lib/app/routes';
	import type { PageProps } from './$types';

	// D-63: the comparison workspace, with its own URL. A direct visit meets the same
	// D-36 acknowledgment the board collects before any scenario opens.
	let { data }: PageProps = $props();
	const storyline = $derived(data.storyline);
	// Keyed on the bundle that opens, so a reused page component never carries one decision's
	// acknowledgment over to another.
	let accepted = $state<string[]>([]);
	const acknowledged = $derived(
		accepted.includes(storyline.bundle.bundleId) || hasAcknowledgedPublic(storyline.bundle.bundleId)
	);
	const pick = $derived(page.url.searchParams.get('scenario'));

	function back(): void {
		// The path is resolve()d; only the scenario query is appended.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(`${resolve('/decisions/[slug]', { slug: storyline.slug })}${scenarioQuery(pick)}`);
	}

	function accept(): void {
		acknowledgePublic(storyline.bundle.bundleId);
		accepted = [...accepted, storyline.bundle.bundleId];
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if acknowledged}
	{#key storyline.slug}
		<HomePage initialBundle={storyline.bundle} onBack={back} />
	{/key}
{:else}
	<CompareGate story={storyline} scenarioId={pick} onAccept={accept} />
{/if}
