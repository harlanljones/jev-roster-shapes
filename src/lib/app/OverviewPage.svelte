<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		currentSlug,
		getStoryline,
		storylineRegistry,
		storylinesByDate
	} from '$lib/storylines/registry';
	import WymanBoard from './diagrams/WymanBoard.svelte';
	import { formatDay, todayIso } from './season-timeline';
	import { benchTray, buildPool, lineupBin, locksOf, scenarioLineup } from './shape-case';

	// D-63 sets what `/` carries: what the tool does, the current decision's board, the framework
	// credit, how it works and a plain question-and-answer FAQ, with one primary action. D-65 sets
	// how: a plain front page in reading order, with no hero, tagline, reveal or repeated action.
	const story = getStoryline(currentSlug(todayIso()))!;
	const bundle = story.bundle;
	const baseline = bundle.comparison.baseline;
	const pool = buildPool(bundle);
	const lineup = scenarioLineup(bundle, baseline);
	const locks = locksOf(baseline);
	const bin = lineupBin(pool, lineup, locks);
	const tray = benchTray(pool, lineup, locks);

	const players = new Set(
		storylineRegistry.flatMap(({ bundle: b }) => b.dataset.players.map((p) => p.id))
	).size;
	const short = (iso: string) => formatDay(iso, { month: 'short' });
	const first = storylinesByDate[0]!;
	const last = storylinesByDate[storylinesByDate.length - 1]!;

	const steps = [
		{
			title: 'Pick a decision',
			text: `Eight dated calls from Boston's 2026 season, from replacing Alex Bregman on ${short(first.eventDate)} to the Jarren Duran question on ${short(last.eventDate)}.`
		},
		{
			title: 'Read the board',
			text: 'The lineup is packed under a lid set by the best nine that same roster could field. The gap under the lid is what the move leaves off.'
		},
		{
			title: 'Test the alternatives',
			text: 'Open the workspace to move plate appearances between a baseline and two candidates, open any number to its source, and export a file someone else can replay.'
		}
	];

	const shows = [
		{
			lead: 'Who plays and who sits',
			text: 'Which positions go uncovered, and how many runs the lineup leaves against the best the same roster allows.'
		},
		{
			lead: 'Where every number came from',
			text: 'Open a number to see its source value, the assumption behind it, and the formula and version that produced it.'
		},
		{
			lead: 'Missing stays missing',
			text: 'A player without a rate is named and left out of the total, never scored as zero, so a sum is never quietly wrong.'
		},
		{
			lead: 'Judgment is labelled as judgment',
			text: 'Shape labels, fit grades and split estimates are marked as an analyst reading, separate from the observed numbers they sit beside.'
		}
	];

	const faq = [
		{
			q: 'Is this affiliated with Taylor Wyman?',
			a: 'No. The roster shapes idea is his, and this project credits it, but he has no involvement here and has not reviewed or endorsed it.'
		},
		{
			q: 'What is a roster shape?',
			a: 'A way of drawing a roster as pieces packed into a box. A piece that sits flush fills its spot; the white space left over is what a better team would add.'
		},
		{
			q: 'How is this different from his diagrams?',
			a: 'His colour means role and is explicitly not a rating; here it is a player’s split against the league. His shapes describe fit; here they are an analyst’s profile label. The method page lists every difference.'
		},
		{
			q: 'Where does the data come from?',
			a: 'Public MLB Stats API values, dated per decision to what was known on that date. There is no team data.'
		},
		{
			q: 'Are these projections?',
			a: 'No. Rates are observed 2026 values, and the workload horizon is an illustrative placeholder.'
		},
		{
			q: 'Does it tell you what move to make?',
			a: 'No. It prepares a decision by showing the trade offs and their sources. Choosing the move stays with the person making it.'
		},
		{
			q: 'What is Jev?',
			a: 'A classification model asked about each player’s profile. Its answers are advisory, shown beside the roster, and never change a number.'
		},
		{
			q: 'Does it store anything about me?',
			a: 'No accounts, no cookies, no analytics. Drafts you save stay in this browser until you delete them.'
		}
	];
</script>

<svelte:head>
	<title>Roster Shapes · baseball roster decisions as shapes in a box</title>
	<meta
		name="description"
		content="Taylor Wyman's roster shapes idea, applied to eight real 2026 Red Sox decisions. See who plays, who sits, and what a move leaves off the field, with every number traced to its source."
	/>
</svelte:head>

<div class="overview">
	<header class="head">
		<h1 class="page-title">Roster decisions as shapes in a box</h1>
		<p class="page-lead">
			Taylor Wyman’s roster shapes idea, applied to eight real 2026 Red Sox decisions. Every lineup
			slot is a cutout, every player a piece sized by the runs he produced, and the empty space is
			what a move leaves off the field.
		</p>
		<div class="actions">
			<a class="button button-primary" href={resolve('/decisions/[slug]', { slug: story.slug })}
				>Open the current decision</a
			>
			<a href={resolve('/decisions')}>See all eight</a>
		</div>
		<p class="facts">
			<span>{storylineRegistry.length} dated decisions</span>
			<span>{players} players</span>
			<span>{short(first.eventDate)} to {short(last.eventDate)}, 2026</span>
			<span>public MLB data</span>
		</p>
	</header>

	<figure class="board">
		<WymanBoard
			{pool}
			{bin}
			{tray}
			fit
			selected={null}
			onSelect={(id: string) =>
				void goto(resolve('/players/[id]', { id: id.replace(/^mlbam-/, '') }))}
			label="{story.short}: the planned lineup packed under the most this roster could field"
		/>
		<figcaption>
			<span class="caption-title">{story.title}</span>
			<span class="caption-meta"
				>The current decision, {short(story.eventDate)}. Pieces sized by actual 2026 runs; select
				one to open the player.</span
			>
		</figcaption>
	</figure>

	<section aria-labelledby="shows-title">
		<h2 id="shows-title">What the board shows</h2>
		<p class="intro">
			A roster move changes more than one slot. The board puts the whole lineup, the bench and the
			best alternative on one screen.
		</p>
		<ul>
			{#each shows as s (s.lead)}
				<li><strong>{s.lead}.</strong> {s.text}</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="steps-title">
		<h2 id="steps-title">How it works</h2>
		<ol>
			{#each steps as s (s.title)}
				<li><strong>{s.title}.</strong> {s.text}</li>
			{/each}
		</ol>
	</section>

	<section aria-labelledby="credit-title">
		<h2 id="credit-title">Built on Taylor Wyman’s idea</h2>
		<p>
			Taylor Wyman, a Senior NBA Analyst at The BBall Index, originated the roster shapes diagram
			and drew the first ones by hand on TikTok, where the format took off. Other analysts credit
			him by name when they build on it, and so does this project.
		</p>
		<p>
			His method shaped ours as much as his picture did: tiers over false precision, impact kept
			apart from talent, and no trusting a number you cannot see inside.
		</p>
		<p class="links">
			<a href="https://www.tiktok.com/@taylormetrics">@taylormetrics on TikTok</a>
			<a href={resolve('/method')}>What we kept, cut and borrowed</a>
		</p>
	</section>

	<section aria-labelledby="faq-title">
		<h2 id="faq-title">Questions</h2>
		<dl>
			{#each faq as item (item.q)}
				<div class="qa">
					<dt>{item.q}</dt>
					<dd>{item.a}</dd>
				</div>
			{/each}
		</dl>
	</section>
</div>

<style>
	.overview {
		max-width: var(--page-max);
		margin: 0 auto;
		padding: var(--spacing-300) var(--spacing-300) 0;
	}
	.head {
		display: grid;
		gap: var(--spacing-200);
		padding-bottom: var(--spacing-400);
	}
	.page-lead {
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-300);
	}
	.actions a:not(.button) {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-75) var(--spacing-300);
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.board {
		display: grid;
		gap: var(--spacing-200);
		margin: 0;
		padding: var(--spacing-300);
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		background: var(--case-100);
		min-width: 0;
	}
	figcaption {
		display: grid;
		gap: var(--spacing-50);
	}
	.caption-title {
		font-weight: 600;
	}
	.caption-meta {
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	section {
		display: grid;
		gap: var(--spacing-200);
		max-width: var(--hero-max);
		margin-top: var(--spacing-400);
		padding-top: var(--spacing-400);
		border-top: 1px solid var(--case-300);
	}
	h2 {
		margin: 0;
		font-size: var(--text-xl);
		line-height: var(--text-xl--lh);
	}
	section p,
	section ul,
	section ol,
	section dl {
		margin: 0;
	}
	section ul,
	section ol {
		display: grid;
		gap: var(--spacing-100);
		padding-left: var(--spacing-300);
	}
	.intro,
	section li,
	.qa dd {
		color: var(--ink-muted);
	}
	section li strong,
	.qa dt {
		color: var(--ink);
		font-weight: 600;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-300);
	}
	.links a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	dl {
		display: grid;
		gap: var(--spacing-200);
	}
	.qa {
		display: grid;
		gap: var(--spacing-50);
	}
	.qa dd {
		margin: 0;
	}

	@media (max-width: 640px) {
		.overview {
			padding: var(--spacing-200) var(--spacing-200) 0;
		}
		.actions .button {
			width: 100%;
		}
	}
</style>
