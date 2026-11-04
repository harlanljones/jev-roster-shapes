<script lang="ts">
	import { resolve } from '$app/paths';
	import ProsePage from '$lib/app/ProsePage.svelte';
</script>

<svelte:head>
	<title>Terms · Roster Shapes</title>
	<meta name="description" content="Licence, data terms and limits for Roster Shapes." />
</svelte:head>

<ProsePage
	title="Licence, data and limits"
	lead="This page summarises the terms that already apply to the project. It is a plain statement of fact, not a reviewed legal document."
>
	<h2>The software</h2>
	<p>
		Roster Shapes is released under the
		<a href="https://github.com/harlanljones/jev-roster-shapes/blob/main/LICENSE">MIT licence</a>.
		It is provided as is, without warranty of any kind.
	</p>
	<h2>The data</h2>
	<p>
		Player and team figures come from public MLB Stats API endpoints and carry their own terms,
		including the MLBAM copyright notice, recorded per source in each data bundle. There is no team
		data and no approved projection source.
	</p>
	<h2>What it is not</h2>
	<ul>
		<li>
			Not a recommendation. The tool shows trade offs and their sources; it does not choose a move.
		</li>
		<li>Not affiliated with MLB, the Boston Red Sox, or any club.</li>
		<li>
			Not affiliated with Taylor Wyman or The BBall Index. The roster shapes framework is his idea,
			credited on the <a href={resolve('/method')}>method page</a>; every judgment and number here
			is this project’s own.
		</li>
	</ul>
</ProsePage>
