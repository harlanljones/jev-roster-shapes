<script lang="ts">
	import { isProfileLabel, type JevRecord, type JevSystemOneRequest } from '$lib/classification';
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { callView, type CallCompare, type CallQuestion } from '../jev-call';

	// One player's Jev call as a primary component (D-57): the state it was
	// given, then every question with its type, instructions, and criteria,
	// and what came back laid on the criteria with the rule baseline (R) and
	// the analyst label (A) beside Jev (J). Without an answer it shows the
	// questions and no probabilities; it never invents one.
	let {
		name,
		request,
		record,
		compare
	}: {
		name: string;
		request: JevSystemOneRequest;
		record: JevRecord | null;
		compare: CallCompare;
	} = $props();

	let stateOpen = $state(window.matchMedia('(min-width: 720px)').matches);

	const view = $derived(callView(request, record, compare));
	const pct = (v: number) => `${Math.round(v * 100)}%`;
	const typeLabel = (q: CallQuestion) => (q.type === 'noul' ? 'True / False' : 'Choice');
	const noulText = (q: CallQuestion) =>
		q.type === 'noul' && q.probability !== null ? q.probability.toFixed(2) : '';
	const isOpen = (o: { jev: boolean; baseline: boolean; analyst: boolean }) =>
		view.answered ? o.jev : compare.baseline?.label ? o.baseline : o.analyst;
	const MARKS = [
		['J', 'jev', 'Jev'],
		['R', 'baseline', 'Rule baseline'],
		['A', 'analyst', 'Analyst']
	] as const;
</script>

<article class="call" aria-label="Jev call for {name}">
	<header class="head">
		<h2>Jev call · {name}</h2>
		<p class="meta">
			<span class="chip">POST /v1/systemone</span>
			<span class="chip">{view.model}</span>
			<span class="chip">{view.promptVersion}</span>
			<span class="chip status" class:answered={view.answered}>{view.status}</span>
		</p>
	</header>

	<section class="sec" aria-label="State">
		<details class="state-details" bind:open={stateOpen}>
			<summary
				><h3 class="label">State · what Jev is told</h3>
				<span class="count">{view.state.length} fields</span></summary
			>
			<dl class="state">
				{#each view.state as row (row.key)}
					<dt>{row.key}</dt>
					<dd class:missing={row.missing}>{row.value}</dd>
				{/each}
			</dl>
		</details>
	</section>

	{#each view.questions as q, index (q.key)}
		<section class="sec" aria-label="Question {q.key}">
			<h3 class="qhead">
				<span class="n">Q{index + 1}</span>
				<span class="qkey">{q.key}</span>
				<span class="type {q.type}">{typeLabel(q)}</span>
				{#if q.type === 'choice' && q.confidence !== null}
					<span class="label conf">confidence {pct(q.confidence)}</span>
				{/if}
			</h3>
			<p class="instr">{q.instructions}</p>
			{#if q.type === 'choice'}
				<ul class="options">
					{#each q.options as o (o.option)}
						<li>
							<details open={isOpen(o)}>
								<summary>
									{#if isProfileLabel(o.option)}<ShapeGlyph shape={o.option} size={18} />{/if}
									<span class="opt">{o.option}</span>
									{#if o.probability !== null}
										<span class="bar" aria-hidden="true"
											><i style:width="{(o.probability * 100).toFixed(1)}%"></i></span
										>
										<span class="pct">{pct(o.probability)}</span>
									{:else}
										<span class="bar empty" aria-hidden="true"></span>
										<span class="pct na">—</span>
									{/if}
									<span class="marks">
										{#each MARKS as [letter, field, title] (letter)}
											<span class="mk {letter}" class:off={!o[field]} {title}
												>{o[field] ? letter : ''}<span class="sr"
													>{o[field] ? ` ${title} pick` : ''}</span
												></span
											>
										{/each}
									</span>
								</summary>
								<div class="txt">
									<p>{o.text}</p>
									{#if o.rule}<p class="rule">Rule: {o.rule}</p>{/if}
								</div>
							</details>
						</li>
					{/each}
				</ul>
				{#if compare.baseline?.abstained}
					<p class="note">Rule baseline abstained: {compare.baseline.reason}</p>
				{/if}
			{:else}
				<div class="noul">
					<p><b>false</b> · {q.whenFalse}</p>
					<p class="right"><b>true</b> · {q.whenTrue}</p>
				</div>
				{#if q.probability !== null}
					<div
						class="gauge"
						role="meter"
						aria-label="{q.key}: probability true"
						aria-valuemin="0"
						aria-valuemax="1"
						aria-valuenow={q.probability}
					>
						<b style:left="{q.probability * 100}%"></b>
						<span style:left="{q.probability * 100}%">{noulText(q)}</span>
					</div>
				{:else}
					<p class="note">No answer yet.</p>
				{/if}
			{/if}
		</section>
	{/each}

	<p class="foot">
		Advisory only. An answer never changes a run total, a lineup, or a piece's size.
	</p>
</article>

<style>
	.call {
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		background: var(--case-100);
		overflow: hidden;
	}
	.head {
		display: grid;
		gap: var(--spacing-75);
		border-bottom: 1px solid var(--case-300);
		padding: var(--spacing-100) var(--spacing-200);
	}
	h2 {
		margin: 0;
		font-family: var(--font-sans);
		font-size: var(--text-xl);
		line-height: var(--text-xl--lh);
		font-weight: 400;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-50);
		margin: 0;
	}
	.chip {
		border: 1px solid var(--case-300);
		border-radius: var(--radius-sm);
		padding: var(--spacing-50) var(--spacing-75);
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
	}
	.status {
		border-style: dashed;
		color: var(--ink);
	}
	.status.answered {
		border-style: solid;
		border-color: var(--turf);
		color: var(--turf);
	}
	.sec {
		display: grid;
		gap: var(--spacing-75);
		border-bottom: 1px solid var(--case-300);
		padding: var(--spacing-100) var(--spacing-200);
	}
	.label,
	.n {
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	/* D-62: open on wide screens; on a phone the table folds away so the board is not
	   pushed thousands of pixels down, while D-60's order (the call first) is kept. */
	.state-details summary {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--spacing-75);
		min-height: 44px;
		cursor: pointer;
		list-style: none;
	}
	.state-details summary::-webkit-details-marker {
		display: none;
	}
	.state-details summary h3 {
		margin: 0;
	}
	.state-details summary::after {
		content: 'Show';
		color: var(--turf);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}
	.state-details[open] summary::after {
		content: 'Hide';
	}
	.count {
		margin-left: auto;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.state {
		display: grid;
		grid-template-columns: minmax(6rem, 38%) minmax(0, 1fr);
		gap: var(--spacing-25) var(--spacing-100);
		margin: 0;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.state dt {
		color: var(--ink-muted);
		overflow-wrap: anywhere;
	}
	.state dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	@media (max-width: 520px) {
		.state {
			grid-template-columns: minmax(0, 1fr);
		}
		.state dd {
			margin-bottom: var(--spacing-100);
		}
	}
	.state dd.missing {
		color: var(--grade-fits);
	}
	.qhead {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-75);
		align-items: center;
		margin: 0;
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
	}
	.qkey {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}
	.type {
		border: 1px solid;
		border-radius: var(--radius-sm);
		padding: var(--spacing-50) var(--spacing-75);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.type.choice {
		color: var(--turf);
	}
	.type.noul {
		color: var(--turf);
	}
	.conf {
		margin-left: auto;
	}
	.instr {
		margin: 0;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-75) var(--spacing-100);
		background: var(--case-000);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.options {
		display: grid;
		gap: var(--spacing-25);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	details[open] {
		border-radius: var(--radius-md);
		background: var(--case-000);
	}
	summary {
		display: grid;
		grid-template-columns: 18px 6rem minmax(2rem, 1fr) 2.5rem auto;
		gap: var(--spacing-75);
		align-items: center;
		min-height: 2rem;
		padding: var(--spacing-50) var(--spacing-75);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		cursor: pointer;
		list-style: none;
	}
	/* At phone width the probability bar takes its own row, so the option row never widens
	   the page. */
	@media (max-width: 420px) {
		summary {
			grid-template-columns: 18px minmax(0, 1fr) 2.5rem auto;
		}
		summary .bar {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.opt {
		font-weight: 600;
	}
	.bar {
		height: 8px;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--case-100);
	}
	.bar.empty {
		border-style: dashed;
		background: transparent;
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--ink);
	}
	.pct {
		text-align: right;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.pct.na {
		color: var(--ink-muted);
	}
	.marks {
		display: inline-flex;
		gap: var(--spacing-25);
	}
	.mk {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		color: var(--case-100);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		text-align: center;
	}
	.mk.J {
		background: var(--ink);
	}
	.mk.R {
		background: var(--turf);
	}
	.mk.A {
		background: var(--grade-fits);
	}
	.mk.off {
		background: transparent;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.txt {
		display: grid;
		gap: var(--spacing-50);
		padding: 0 var(--spacing-75) var(--spacing-75) var(--spacing-400);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.txt p {
		margin: 0;
	}
	.rule {
		color: var(--turf);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
	}
	.noul {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-100);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.noul p {
		margin: 0;
	}
	.noul b {
		color: var(--ink);
	}
	.right {
		text-align: right;
	}
	.gauge {
		position: relative;
		height: 10px;
		margin-bottom: var(--spacing-200);
		border: 1px solid var(--case-300);
		border-radius: var(--radius-sm);
		background: var(--case-200);
	}
	.gauge b {
		position: absolute;
		top: -5px;
		width: 3px;
		height: 18px;
		background: var(--ink);
		transform: translateX(-1px);
	}
	.gauge span {
		position: absolute;
		top: 15px;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}
	.note,
	.foot {
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.foot {
		padding: var(--spacing-100) var(--spacing-200);
	}
</style>
