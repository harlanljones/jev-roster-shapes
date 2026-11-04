<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Icon from '$lib/ui/Icon.svelte';
	import { currentSlug, getStoryline, storylineRegistry } from '$lib/storylines/registry';
	import WymanBoard from './diagrams/WymanBoard.svelte';
	import { reveal } from './reveal';
	import { todayIso } from './season-timeline';
	import { benchTray, buildPool, lineupBin, locksOf, scenarioLineup } from './shape-case';
	import TaglineReveal from './TaglineReveal.svelte';

	// D-63: the overview at `/`, built with ai-design-skills' landing-page-design (Part A):
	// one action (open the current decision), the product itself as the hero visual, proof
	// beside the claim, the framework credit, a plain question-and-answer FAQ.
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
	const short = (iso: string) =>
		new Date(`${iso}T00:00:00Z`).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		});
	const first = storylineRegistry[0]!;
	const last = storylineRegistry[storylineRegistry.length - 1]!;

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

	const benefits = [
		{
			lead: 'See the trade before you make it',
			text: 'Who plays, who sits, which positions go uncovered, and how many runs the lineup leaves against the best the same roster allows.'
		},
		{
			lead: 'Know where every number came from',
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
	<section class="hero" aria-labelledby="hero-title">
		<div class="hero-copy">
			<h1 id="hero-title" class="page-title">
				<span class="line">Read a roster move</span>
				<span class="line">as shapes in a box</span>
			</h1>
			<p class="page-lead">
				Taylor Wyman’s roster shapes idea, applied to eight real 2026 Red Sox decisions. Every
				lineup slot is a cutout, every player a piece sized by the runs he produced, and the empty
				space is what a move leaves off the field.
			</p>
			<div class="actions">
				<a class="button button-primary" href={resolve('/decisions/[slug]', { slug: story.slug })}
					>Open the current decision <Icon name="arrow-right" size={18} /></a
				>
				<a class="text-link" href={resolve('/decisions')}>See all eight</a>
			</div>
			<p class="proof">
				<span>{storylineRegistry.length} dated decisions</span>
				<span>{players} players</span>
				<span>{short(first.eventDate)} to {short(last.eventDate)}, 2026</span>
				<span>Every number opens its source</span>
			</p>
		</div>
		<figure class="hero-board">
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
	</section>

	<section class="tagline-section" aria-label="The idea" use:reveal>
		<TaglineReveal
			lines={['Every roster is a box to fill.', 'The gaps are where the argument starts.']}
		/>
		<p class="tagline-credit">
			The box is Taylor Wyman’s idea, drawn by hand for NBA rosters. The baseball gaps are ours.
		</p>
	</section>

	<section class="benefits" aria-labelledby="benefits-title" use:reveal>
		<div class="benefits-head">
			<h2 id="benefits-title">What the board shows you</h2>
			<p>
				A roster move changes more than one slot. The board puts the whole lineup, the bench and the
				best alternative on one screen.
			</p>
		</div>
		<ul class="benefit-list">
			{#each benefits as b (b.lead)}
				<li><strong>{b.lead}.</strong> {b.text}</li>
			{/each}
		</ul>
	</section>

	<section class="steps" aria-labelledby="steps-title" use:reveal>
		<h2 id="steps-title">How it works</h2>
		<ol>
			{#each steps as s, i (s.title)}
				<li>
					<span class="step-n" aria-hidden="true">0{i + 1}</span>
					<h3>{s.title}</h3>
					<p>{s.text}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="credit" aria-labelledby="credit-title" use:reveal>
		<h2 id="credit-title">Built on Taylor Wyman’s idea</h2>
		<div class="credit-body">
			<p>
				Taylor Wyman, a Senior NBA Analyst at The BBall Index, originated the roster shapes diagram
				and drew the first ones by hand on TikTok, where the format took off. Other analysts credit
				him by name when they build on it, and so does this project.
			</p>
			<p>
				His method shaped ours as much as his picture did: tiers over false precision, impact kept
				apart from talent, and no trusting a number you cannot see inside.
			</p>
			<div class="credit-links">
				<a class="text-link" href="https://www.tiktok.com/@taylormetrics"
					>@taylormetrics on TikTok <Icon name="arrow-up-right" size={16} /></a
				>
				<a class="text-link" href={resolve('/method')}>What we kept, cut and borrowed</a>
			</div>
		</div>
	</section>

	<section class="faq" aria-labelledby="faq-title" use:reveal>
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

	<section class="final" aria-labelledby="final-title" use:reveal>
		<h2 id="final-title">Start with today’s decision</h2>
		<a class="button button-primary" href={resolve('/decisions/[slug]', { slug: story.slug })}
			>Open the current decision <Icon name="arrow-right" size={18} /></a
		>
		<p class="reassure">Free. No account. Nothing to install. Public data only.</p>
	</section>
</div>

<style>
	.overview {
		max-width: var(--page-max);
		margin: 0 auto;
		padding: 0 var(--spacing-300);
	}
	section {
		padding-block: var(--spacing-800);
	}
	h2 {
		margin: 0;
		font-size: var(--text-3xl);
		line-height: var(--text-3xl--lh);
		letter-spacing: -0.02em;
	}

	/* Hero: copy left, the live board right. */
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
		align-items: center;
		gap: var(--spacing-600);
		padding-block: var(--spacing-700) var(--spacing-800);
	}
	.hero-copy {
		display: grid;
		gap: var(--spacing-300);
		min-width: 0;
	}
	.page-title .line {
		display: block;
		white-space: nowrap;
	}
	.page-lead {
		margin: 0;
		max-width: 34rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-300);
	}
	.text-link {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-50);
		min-height: 44px;
		color: var(--ink);
		font-weight: 600;
		text-decoration: underline;
		text-decoration-color: var(--case-400);
		text-underline-offset: 4px;
	}
	.text-link:hover {
		text-decoration-color: currentColor;
	}
	.proof {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-75) var(--spacing-300);
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.hero-board {
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

	.tagline-section {
		display: grid;
		gap: var(--spacing-300);
		padding-block: var(--spacing-900);
	}
	.tagline-credit {
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	/* Benefits: an asymmetric two-column list, not a row of equal cards. */
	.benefits {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		gap: var(--spacing-600);
		align-items: start;
		border-top: 1px solid var(--case-300);
	}
	.benefits-head {
		display: grid;
		gap: var(--spacing-200);
	}
	.benefits-head p {
		margin: 0;
		color: var(--ink-muted);
	}
	.benefit-list {
		display: grid;
		gap: var(--spacing-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.benefit-list li {
		padding-bottom: var(--spacing-300);
		border-bottom: 1px solid var(--case-300);
		color: var(--ink-muted);
		font-size: var(--text-lg);
		line-height: var(--text-lg--lh);
	}
	.benefit-list strong {
		color: var(--ink);
		font-weight: 600;
	}

	.steps {
		display: grid;
		gap: var(--spacing-400);
		border-top: 1px solid var(--case-300);
	}
	.steps ol {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--spacing-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.steps li {
		display: grid;
		align-content: start;
		gap: var(--spacing-100);
	}
	.step-n {
		color: var(--turf);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 500;
	}
	.steps h3 {
		margin: 0;
		font-size: var(--text-xl);
		line-height: var(--text-xl--lh);
	}
	.steps p {
		margin: 0;
		color: var(--ink-muted);
	}

	.credit {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		gap: var(--spacing-600);
		border-top: 1px solid var(--case-300);
	}
	.credit-body {
		display: grid;
		gap: var(--spacing-200);
	}
	.credit-body p {
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-lg);
		line-height: var(--text-lg--lh);
	}
	.credit-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-300);
	}

	/* FAQ: a side-by-side list rather than an accordion. */
	.faq {
		display: grid;
		gap: var(--spacing-400);
		border-top: 1px solid var(--case-300);
	}
	.faq dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-400) var(--spacing-600);
		margin: 0;
	}
	.qa {
		display: grid;
		align-content: start;
		gap: var(--spacing-75);
	}
	.qa dt {
		font-weight: 600;
	}
	.qa dd {
		margin: 0;
		color: var(--ink-muted);
	}

	.final {
		display: grid;
		justify-items: start;
		gap: var(--spacing-300);
		border-top: 1px solid var(--case-300);
	}
	.reassure {
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	@media (max-width: 960px) {
		.hero,
		.benefits,
		.credit {
			grid-template-columns: minmax(0, 1fr);
		}
		.steps ol,
		.faq dl {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 640px) {
		.overview {
			padding: 0 var(--spacing-200);
		}
		section {
			padding-block: var(--spacing-600);
		}
		.hero {
			padding-block: var(--spacing-400) var(--spacing-600);
		}
		.page-title .line {
			white-space: normal;
		}
		.actions .button {
			width: 100%;
		}
	}
</style>
