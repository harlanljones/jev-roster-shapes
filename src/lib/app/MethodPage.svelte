<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '$lib/ui/Icon.svelte';
	import CaseKey from './diagrams/CaseKey.svelte';
	import SplitLegend from './diagrams/SplitLegend.svelte';

	// D-63: how to read a board, whose idea it is, and what this project kept, cut and borrowed
	// from it. The full record is docs/wyman-diagram.md.
	const audit = [
		{
			rule: 'A roster is a box to fill; the best team leaves no white',
			call: 'Kept',
			note: 'The case and the capacity bin, with a lid at the most this roster could field.'
		},
		{
			rule: 'Size is value over replacement',
			call: 'Borrowed in part',
			note: 'Area is observed 2026 runs today. A replacement baseline is a recorded proposal; the basketball exponent is cut.'
		},
		{
			rule: 'The outline is how easily a player fits',
			call: 'Kept apart',
			note: 'Here the shape is a profile label and fit is graded separately, snug, fits or loose, never as a number.'
		},
		{
			rule: 'Colour is role, and colour is not a rating',
			call: 'Diverges',
			note: 'Here colour is a split against the league line, which is a rating. The legend says so wherever it appears.'
		},
		{
			rule: 'Position in the box is layout only',
			call: 'Strengthened',
			note: 'Each cutout is a real lineup slot, because baseball positions are eligibility constraints.'
		},
		{
			rule: 'White is what a perfect team would add',
			call: 'Refined',
			note: 'An empty cutout is a position nobody covers; headroom under the lid is value left off.'
		},
		{
			rule: 'A team fit figure for lineups playing together',
			call: 'Cut',
			note: 'It needs lineup data this project does not have, and the basketball signal is about 1 percent.'
		},
		{
			rule: 'State the honest ceiling; a choice is stated as one',
			call: 'Kept and credited',
			note: 'Judgment layers are labelled, and missing values are never scored as zero.'
		}
	];
</script>

<svelte:head>
	<title>How to read it · Roster Shapes</title>
	<meta
		name="description"
		content="How to read a Roster Shapes board, the roster shapes framework Taylor Wyman originated, and what this project kept, cut and borrowed from it."
	/>
</svelte:head>

<article class="method">
	<header class="head">
		<h1 class="page-title">How to read a board</h1>
		<p class="page-lead">
			A board is a lineup cut into a fitted case. Read it in three passes: the pieces, the space
			they leave, and the colour on each half.
		</p>
	</header>

	<section aria-labelledby="pieces-title">
		<h2 id="pieces-title">The pieces</h2>
		<div class="cols">
			<p>
				Each player is a piece. Its area is the runs he actually produced in 2026, so a bigger piece
				did more. Its shape is an analyst’s profile label, drawn at the same area for every shape,
				so the outline says what kind of player and never how much. A Star here means a player who
				is hard to fit, not a star player.
			</p>
			<CaseKey compact />
		</div>
	</section>

	<section aria-labelledby="space-title">
		<h2 id="space-title">The space they leave</h2>
		<dl class="terms">
			<div>
				<dt>The lid</dt>
				<dd>The most this roster could field in hindsight, packed the tightest way it allows.</dd>
			</div>
			<div>
				<dt>Headroom</dt>
				<dd>The gap between the top of the pile and the lid: value the lineup leaves off.</dd>
			</div>
			<div>
				<dt>An empty cutout</dt>
				<dd>A position nobody on the roster covers. It always carries its position label.</dd>
			</div>
			<div>
				<dt>Visible foam</dt>
				<dd>A piece in a slot it does not fill: friction, graded snug, fits or loose.</dd>
			</div>
		</dl>
	</section>

	<section aria-labelledby="colour-title">
		<h2 id="colour-title">The colour on each half</h2>
		<SplitLegend />
	</section>

	<section aria-labelledby="credit-title">
		<h2 id="credit-title">Whose idea this is</h2>
		<div class="credit">
			<p>
				The roster shapes diagram, also called the Wyman Diagram, was originated by Taylor Wyman (<a
					href="https://www.tiktok.com/@taylormetrics">@taylormetrics</a
				>
				on TikTok and
				<a href="https://x.com/taylormetrics">X</a>), a Senior NBA Analyst at The BBall Index who
				worked previously at PFF and MLB. He drew the first ones by hand, and other analysts credit
				him by name when they build on the format.
			</p>
			<p>
				His method shaped this one too: tiers over false precision, impact kept apart from talent,
				and understanding a number before trusting it. He has no involvement in this project and has
				not reviewed it. Any error in describing his work is ours.
			</p>
		</div>
	</section>

	<section aria-labelledby="audit-title">
		<h2 id="audit-title">What this project kept, cut and borrowed</h2>
		<div class="table-wrap">
			<table>
				<caption class="visually-hidden">His rule, what this project does with it, and why</caption>
				<thead>
					<tr><th scope="col">His rule</th><th scope="col">Here</th><th scope="col">Why</th></tr>
				</thead>
				<tbody>
					{#each audit as row (row.rule)}
						<tr><td>{row.rule}</td><td class="call">{row.call}</td><td>{row.note}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="more">
			The full record, with sources, is in
			<a href="https://github.com/harlanljones/jev-roster-shapes/blob/main/docs/wyman-diagram.md"
				>the framework guide <Icon name="arrow-up-right" size={14} /></a
			>.
		</p>
	</section>

	<p class="back"><a href={resolve('/decisions')}>See the eight decisions</a></p>
</article>

<style>
	.method {
		max-width: var(--page-max);
		margin: 0 auto;
		padding: var(--spacing-700) var(--spacing-300) 0;
	}
	.head {
		display: grid;
		gap: var(--spacing-200);
		padding-bottom: var(--spacing-600);
	}
	.page-lead {
		margin: 0;
	}
	section {
		display: grid;
		gap: var(--spacing-300);
		padding-block: var(--spacing-600);
		border-top: 1px solid var(--case-300);
	}
	h2 {
		margin: 0;
		font-size: var(--text-2xl);
		line-height: var(--text-2xl--lh);
		letter-spacing: -0.02em;
	}
	p {
		max-width: var(--measure);
		margin: 0;
	}
	.cols {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--spacing-400);
		align-items: start;
	}
	.terms {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-300) var(--spacing-600);
		margin: 0;
	}
	.terms dt {
		font-weight: 600;
	}
	.terms dd {
		margin: var(--spacing-50) 0 0;
		color: var(--ink-muted);
	}
	.credit {
		display: grid;
		gap: var(--spacing-200);
	}
	.credit a,
	.more a {
		text-decoration: underline;
	}
	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
	th {
		padding: var(--spacing-100);
		background: var(--case-200);
		color: var(--ink-muted);
		font-weight: 600;
		text-align: left;
	}
	td {
		padding: var(--spacing-100);
		border-top: 1px solid var(--case-300);
		vertical-align: top;
	}
	td.call {
		font-weight: 600;
		white-space: nowrap;
	}
	.more {
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
	.back {
		padding-block: var(--spacing-600) 0;
	}
	@media (max-width: 760px) {
		.method {
			padding-inline: var(--spacing-200);
		}
		.cols,
		.terms {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
