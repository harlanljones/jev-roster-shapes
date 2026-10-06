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

	const view = $derived(callView(request, record, compare));
	const pct = (v: number) => `${Math.round(v * 100)}%`;
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
		<h3 class="label">State · what Jev is told</h3>
		<dl class="state">
			{#each view.state as row (row.key)}
				<dt>{row.key}</dt>
				<dd class:missing={row.missing}>{row.value}</dd>
			{/each}
		</dl>
	</section>

	{#each view.questions as q, index (q.key)}
		<section class="sec" aria-label="Question {q.key}">
			<h3 class="qhead">
				<span class="n">Q{index + 1}</span>
				<span class="qkey">{q.key}</span>
				<span class="type {q.type}">{q.type}</span>
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
		border: 1px solid var(--rule);
		border-radius: 8px;
		background: var(--panel);
		overflow: hidden;
	}
	.head {
		display: grid;
		gap: 0.5rem;
		border-bottom: 1px solid var(--rule);
		padding: 0.85rem 1rem;
	}
	h2 {
		margin: 0;
		font-family: var(--display);
		font-size: 1.35rem;
		font-weight: 400;
		line-height: 1.1;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0;
	}
	.chip {
		border: 1px solid var(--rule);
		border-radius: 3px;
		padding: 0.2rem 0.4rem;
		color: var(--ink-soft);
		font: 500 0.68rem var(--mono);
	}
	.status {
		border-style: dashed;
		color: var(--ink);
	}
	.status.answered {
		border-style: solid;
		border-color: var(--marker);
		color: var(--marker);
	}
	.sec {
		display: grid;
		gap: 0.5rem;
		border-bottom: 1px solid var(--rule);
		padding: 0.75rem 1rem;
	}
	.label,
	.n {
		margin: 0;
		color: var(--ink-soft);
		font: 600 0.68rem var(--mono);
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	.state {
		display: grid;
		grid-template-columns: minmax(6rem, 38%) minmax(0, 1fr);
		gap: 0.1rem 0.75rem;
		margin: 0;
		font: 0.75rem/1.5 var(--mono);
	}
	.state dt {
		color: var(--ink-soft);
		overflow-wrap: anywhere;
	}
	.state dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.state dd.missing {
		color: var(--fits);
		font-style: italic;
	}
	.qhead {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin: 0;
		font-size: 1rem;
	}
	.qkey {
		font: 600 0.82rem var(--mono);
	}
	.type {
		border: 1px solid;
		border-radius: 3px;
		padding: 0.2rem 0.4rem;
		font: 600 0.65rem var(--mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.type.choice {
		color: var(--marker);
	}
	.type.noul {
		color: var(--accent);
	}
	.conf {
		margin-left: auto;
	}
	.instr {
		margin: 0;
		border: 1px solid var(--rule);
		border-radius: 4px;
		padding: 0.6rem 0.75rem;
		background: var(--board);
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.options {
		display: grid;
		gap: 0.1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	details[open] {
		border-radius: 4px;
		background: var(--board);
	}
	summary {
		display: grid;
		grid-template-columns: 18px 6rem minmax(2rem, 1fr) 2.5rem auto;
		gap: 0.5rem;
		align-items: center;
		min-height: 2rem;
		padding: 0.3rem 0.4rem;
		font-size: 0.82rem;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.opt {
		font-weight: 600;
	}
	.bar {
		height: 8px;
		border: 1px solid var(--rule);
		border-radius: 2px;
		overflow: hidden;
		background: var(--panel);
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
		font: 500 0.75rem var(--mono);
		font-variant-numeric: tabular-nums;
	}
	.pct.na {
		color: var(--ink-soft);
	}
	.marks {
		display: inline-flex;
		gap: 3px;
	}
	.mk {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		color: var(--panel);
		font: 600 0.6rem/18px var(--mono);
		text-align: center;
	}
	.mk.J {
		background: var(--ink);
	}
	.mk.R {
		background: var(--marker);
	}
	.mk.A {
		background: var(--fits);
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
		gap: 0.25rem;
		padding: 0 0.6rem 0.6rem 2.1rem;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.5;
	}
	.txt p {
		margin: 0;
	}
	.rule {
		color: var(--marker);
		font: 500 0.72rem var(--mono);
	}
	.noul {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.5;
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
		margin-bottom: 1.1rem;
		border: 1px solid var(--rule);
		border-radius: 2px;
		background: linear-gradient(90deg, #f3d9d6, var(--board) 50%, #d6eadc);
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
		font: 600 0.7rem var(--mono);
	}
	.note,
	.foot {
		margin: 0;
		color: var(--ink-soft);
		font: 0.75rem/1.5 var(--mono);
	}
	.foot {
		padding: 0.75rem 1rem;
	}
</style>
