<script lang="ts">
	import { resolve } from '$app/paths';
	import { calculatePoolFit, poolFitFor } from '$lib/engine';
	import { PLAYER_SHAPES, shapeOf, type ShapeLabel } from '$lib/shapes/taxonomy';
	import {
		DEFAULT_JEV_MODEL,
		PROFILE_LABELS,
		RULE_BASELINE_VERSION,
		UNEVALUABLE_LABELS,
		baselineAgreement,
		buildProfileRequest,
		classifyBaseline,
		toRuleEvidence,
		type BaselineResult,
		type JevRecord
	} from '$lib/classification';
	import type { Storyline } from '$lib/storylines/registry';
	import DecisionNav from './DecisionNav.svelte';
	import { LABELED_MEDIAN_RATE, evidenceFor, provenanceNote } from './classification-evidence';
	import JevCall from './diagrams/JevCall.svelte';
	import PieceDetail from './diagrams/PieceDetail.svelte';
	import RosterDiagram from './diagrams/RosterDiagram.svelte';
	import { sourceLabels } from './jev-call';
	import { jevRecordFor, recordedCount } from './jev-results';
	import {
		benchTray,
		buildPool,
		caseView,
		grade,
		lineupBin,
		lineupIds,
		locksOf,
		scenarioLineup,
		type Role
	} from './shape-case';

	// Snapshots (D-46, D-47, D-55): the exact prompt the Jev rubric would be
	// asked, what came back, and the transparent rule-based baseline applied to
	// the same evidence — next to the roster they describe. Nothing here can
	// change a calculation: the classification layer is advisory, opt-in, and
	// its state is separate from every engine number on the decision page.
	let { story }: { story: Storyline } = $props();

	const bundle = $derived(story.bundle);
	const pool = $derived(buildPool(bundle));
	const analysis = $derived(calculatePoolFit(bundle));
	const scenarios = $derived([bundle.comparison.baseline, ...bundle.comparison.candidates]);
	let scenarioId = $state('');
	const scenario = $derived(scenarios.find((s) => s.id === scenarioId) ?? scenarios[0]!);
	const fit = $derived(poolFitFor(analysis, scenario.id)!);
	const baseLineup = $derived(scenarioLineup(bundle, bundle.comparison.baseline));
	const lineup = $derived(scenarioLineup(bundle, scenario));
	const view = $derived(caseView(pool, lineup, baseLineup));
	const names = $derived(new Map([...pool.values()].map((player) => [player.id, player.name])));

	let selected = $state<string | null>(null);
	const active = $derived(
		selected && pool.has(selected) ? selected : (lineup['3B'] ?? lineupIds(lineup)[0] ?? null)
	);

	const note = $derived(provenanceNote(story));
	const evidenceOf = (playerId: string) => {
		const player = pool.get(playerId);
		return player ? evidenceFor(bundle, player, note) : null;
	};
	// Answers are the ones CI recorded for these snapshots (D-58); the page never
	// calls the provider.
	const requestOf = (playerId: string) => {
		const evidence = evidenceOf(playerId);
		return evidence ? buildProfileRequest(evidence, DEFAULT_JEV_MODEL) : null;
	};
	const records = $derived(
		Object.fromEntries(
			[...pool.keys()]
				.map((id) => {
					const request = requestOf(id);
					return [id, request ? jevRecordFor(request) : null] as const;
				})
				.filter((entry): entry is readonly [string, JevRecord] => entry[1] !== null)
		)
	);
	// The rule baseline (D-55): the recorded rubric rules applied
	// deterministically over the same evidence the provider request carries.
	// The Diamond cut is the median 2026 season rate of the labeled players
	// (one stable number on every decision). The baseline reads only numeric
	// and eligibility fields, and nothing here can change a calculation.
	const medianRate = LABELED_MEDIAN_RATE;
	const baselineRows = $derived(
		[...pool.keys()].map((id) => {
			const evidence = evidenceOf(id);
			const result = evidence ? classifyBaseline(toRuleEvidence(evidence), { medianRate }) : null;
			return { id, result, analyst: PLAYER_SHAPES[id]?.shape ?? null };
		})
	);
	const baselineSummary = $derived(
		baselineAgreement(
			baselineRows.map(({ result }) => result).filter((r): r is BaselineResult => r !== null),
			Object.fromEntries(
				baselineRows
					.filter(({ analyst }) => analyst !== null)
					.map(({ id, analyst }) => [id, analyst]) as [string, ShapeLabel][]
			)
		)
	);
	const baselineOutcome = (row: (typeof baselineRows)[number]): string => {
		if (!row.result) return 'no evidence on this roster';
		if (row.result.abstained) return 'abstained';
		if (!row.analyst) return 'no analyst label';
		return row.result.label === row.analyst ? 'match' : 'mismatch';
	};
	const locks = $derived(locksOf(scenario));
	const board = $derived(lineupBin(pool, lineup, locks));
	const tray = $derived(benchTray(pool, lineup, locks));
	const labels = $derived(
		new Map(
			baselineRows.map((row) => [
				row.id,
				sourceLabels(records[row.id] ?? null, row.result, pool.get(row.id)?.shape ?? 'Unclassified')
			])
		)
	);
	const thin = $derived(
		new Set(
			Object.entries(records)
				.filter(([, record]) => (record.answer?.evidenceSufficient ?? 1) < 0.5)
				.map(([id]) => id)
		)
	);
	const request = $derived(
		active ? buildProfileRequest(evidenceOf(active)!, DEFAULT_JEV_MODEL) : null
	);
	const requestJson = $derived(request ? JSON.stringify(request, null, 2) : '');
	const answered = $derived(
		[...pool.keys()]
			.map((id) => ({ id, record: records[id] }))
			.filter((entry): entry is { id: string; record: JevRecord } => Boolean(entry.record))
	);
	const agreement = $derived(
		answered.filter(({ id, record }) => record.answer && record.answer.label === shapeOf(id).shape)
			.length
	);
	const usage = $derived(
		answered.reduce(
			(totals, { record }) => ({
				input: totals.input + (record.usage?.inputTokens ?? 0),
				output: totals.output + (record.usage?.outputTokens ?? 0)
			}),
			{ input: 0, output: 0 }
		)
	);
	const topOptions = (record: JevRecord) =>
		record.answer
			? Object.entries(record.answer.probabilities)
					.sort((left, right) => right[1] - left[1])
					.slice(0, 3)
			: [];
	const statusText = (record: JevRecord | undefined): string => {
		if (!record) return 'not recorded';
		if (record.status === 'current') return `current · ${record.model ?? 'model unknown'}`;
		return record.status;
	};
	/** Engine deltas are exact decimal strings; show the sign, not the bare number. */
	const signedRuns = (value: string | null | undefined): string => {
		if (value == null) return 'Δ unavailable';
		const numeric = Number(value);
		return `Δ ${numeric >= 0 ? '+' : '−'}${Math.abs(numeric).toFixed(3)}`;
	};
</script>

<svelte:head>
	<title>Snapshots · {story.title} · Roster Shapes</title>
	<meta
		name="description"
		content="The Jev profile prompt, its answers, and the transparent rule baseline for the {story.title} roster, next to the case they describe."
	/>
</svelte:head>

<div class="snapshots">
	<header class="lead">
		<div>
			<a class="back" href={resolve('/scenario/[slug]', { slug: story.slug })}
				>← Board: {story.title}</a
			>
			<h1>Snapshots: the prompt and its answers</h1>
			<DecisionNav slug={story.slug} current="snapshots" />
			<p class="lede">
				What the Jev rubric is asked about each player on this roster, the exact request that would
				go out, and what came back — beside the case those answers describe. The prompt is frozen
				and versioned, every response is validated before it is shown, and nothing here can change a
				number on the decision page.
			</p>
		</div>
		<aside class="boundary" aria-label="What this page is not">
			<p>
				<strong>Advisory only.</strong> A profile label is an assumption-layer mark. It does not change
				coverage, workload, contribution, or any engine result, and a model probability is never the chance
				an acquisition succeeds.
			</p>
			<p>
				<strong>Not permitted yet.</strong> Whether this data may leave the team environment is an open
				question (O-04), and no acceptable error, latency, or cost limit has been set (O-07). No calibration
				or adoption claim is made from anything on this page.
			</p>
		</aside>
	</header>

	<div class="scenario-strip" role="group" aria-label="Roster whose players are described">
		{#each scenarios as candidate (candidate.id)}
			<button
				type="button"
				class="scenario"
				aria-pressed={candidate.id === scenario.id}
				onclick={() => (scenarioId = candidate.id)}
			>
				{candidate.label}
			</button>
		{/each}
	</div>

	<div class="split">
		<section class="roster" aria-labelledby="roster-heading">
			<h2 id="roster-heading">The roster these answers are about</h2>
			<RosterDiagram
				{pool}
				bin={board}
				{tray}
				{labels}
				{thin}
				selected={active}
				onSelect={(id: string) => (selected = id)}
				label="Roster board for {scenario.label}: the lineup packed under the pool's best, and the players left off the field"
				mode="lanes"
				source="rule"
			/>
			{#if active}
				<PieceDetail {pool} playerId={active} role={view.roleOf.get(active)} />
			{/if}
			<table class="fit-table">
				<caption>
					The engine's best nine for {scenario.label}, per pitcher-hand context
					(pool-fit-analysis-v2)
				</caption>
				<thead>
					<tr>
						<th scope="col">Slot</th>
						<th scope="col">Left-starter context</th>
						<th scope="col">Right-starter context</th>
						<th scope="col">Fit vs lineup used</th>
					</tr>
				</thead>
				<tbody>
					{#each fit.contexts as context (context.templateId)}
						<tr>
							<th scope="row">{context.templateLabel}</th>
							<td colspan="2">
								{#each context.slots as slot (slot.order)}
									{@const player = slot.playerId ? pool.get(slot.playerId) : undefined}
									<span class="slot">
										<b>{slot.role}</b>
										{player ? player.name : 'uncovered'}
										{#if player}
											{@const role = context.slots.find((s) => s.playerId === player.id)?.role}
											<span class="fit">{grade(player, role as Role)}</span>
										{/if}
										<small>{slot.pa} PA · {slot.runs ?? 'unavailable'} runs</small>
									</span>
								{/each}
							</td>
							<td>
								{context.matchesReference
									? 'same nine as the lineup used'
									: 'differs from the lineup used'}
								<br />
								<small>{context.runs ?? 'unavailable'} runs</small>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="fit-note">
				Engine total {fit.runs ?? 'unavailable'} runs ·
				{signedRuns(fit.deltaVsReference?.runs)} against the lineup this scenario used ·
				{fit.transfers.length} plate-appearance transfers ·
				{fit.bench.length} benched
			</p>
		</section>

		<section class="prompt" aria-labelledby="prompt-heading">
			<h2 id="prompt-heading">The prompt</h2>
			<p class="state" data-status="recorded">
				<strong>Recorded answers only.</strong> Jev is asked from CI when new snapshots are pushed
				to main, and the answers are checked in ({recordedCount} recorded). This page never calls the
				provider.
			</p>

			<div class="actions">
				<label for="player">Player</label>
				<select
					id="player"
					value={active ?? ''}
					onchange={(event) => (selected = event.currentTarget.value)}
				>
					{#each [...pool.values()] as player (player.id)}
						<option value={player.id}>{player.name}</option>
					{/each}
				</select>
			</div>
			<p class="status-line" role="status" aria-live="polite">
				{#if active && records[active]}
					{statusText(records[active])} for {names.get(active)}
				{:else}
					No recorded answer for {active ? names.get(active) : 'this player'}.
				{/if}
			</p>

			{#if active && request}
				<JevCall
					name={names.get(active) ?? active}
					{request}
					record={records[active] ?? null}
					compare={{
						baseline: baselineRows.find((row) => row.id === active)?.result ?? null,
						analyst: pool.get(active)?.shape ?? null
					}}
				/>
			{/if}
			<details class="request-toggle">
				<summary>Request body, exactly as it would be sent</summary>
				<pre>{requestJson}</pre>
			</details>
			<p class="request-note">
				Sent by CI to <code>POST /v1/systemone</code> with <code>model: {DEFAULT_JEV_MODEL}</code>
				when this snapshot is pushed to main. The state is the evidence above, verbatim; the questions
				are one closed-set profile choice over the rubric's {PROFILE_LABELS.length}
				options plus one abstention question. An answer is shown only when its request digest, rubric
				version, and prompt version match this exact body.
			</p>
		</section>
	</div>

	<section class="outputs" aria-labelledby="outputs-heading">
		<h2 id="outputs-heading">Outputs</h2>
		{#if answered.length === 0}
			<p class="state" data-status="none">
				No answers recorded yet. CI has not asked Jev for this snapshot, so there is no model
				output, no cost, and no agreement to report. Every number on the decision page is unaffected
				either way.
			</p>
		{:else}
			<div class="table-scroll">
				<table class="answers">
					<caption>
						Validated provider answers against the analyst label. Agreement measures rubric
						alignment, not baseball truth.
					</caption>
					<thead>
						<tr>
							<th scope="col">Player</th>
							<th scope="col">Model label</th>
							<th scope="col">Confidence</th>
							<th scope="col">Evidence sufficient</th>
							<th scope="col">Analyst label</th>
							<th scope="col">Top options</th>
							<th scope="col">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each answered as entry (entry.id)}
							<tr>
								<th scope="row">{names.get(entry.id)}</th>
								<td>{entry.record.answer?.label ?? '—'}</td>
								<td>
									{entry.record.answer ? entry.record.answer.confidence.toFixed(2) : 'unavailable'}
								</td>
								<td>
									{entry.record.answer
										? entry.record.answer.evidenceSufficient.toFixed(2)
										: 'unavailable'}
								</td>
								<td>{shapeOf(entry.id).shape}</td>
								<td class="options">
									{#each topOptions(entry.record) as [label, probability] (label)}
										<span class="option">
											{label}
											{probability.toFixed(2)}
										</span>
									{/each}
								</td>
								<td>
									{statusText(entry.record)}
									{#if entry.record.issues.length > 0}
										<small>
											{entry.record.issues.map(({ code }) => code).join(', ')}: {entry.record.issues
												.map(({ message }) => message)
												.join('; ')}
										</small>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="cost">
				{answered.length} answered · {agreement} matching the analyst label · {usage.input} input tokens
				· {usage.output} output tokens · model {answered[0]?.record.model ?? 'unknown'} ·
				{answered[0]?.record.timingMs ?? 0}ms for the first answer · estimated cost
				{answered[0]?.record.usage?.estimatedCostUsd ?? '0.000000'} per answer at the published list price
			</p>
			<p class="limits">
				No confidence threshold is applied: SPEC §7 does not adopt the original 0.80 and 0.65
				cutoffs, and O-07 has not set tolerable error, so the numbers are reported as model
				estimates. The analyst rationale is deliberately kept out of the prompt, and the rule
				baseline below never sees it either.
			</p>
		{/if}
	</section>

	<section class="baseline" aria-labelledby="baseline-heading">
		<h2 id="baseline-heading">Rule baseline</h2>
		<p class="state">
			The transparent baseline SPEC §7 compares against: the recorded rubric rules applied as
			deterministic predicates over the same evidence the prompt carries — no provider, no model.
			Version {RULE_BASELINE_VERSION}. Every rule that fires is shown; the documented precedence
			picks one label. It is advisory and never changes a calculation.
		</p>
		<div class="table-scroll">
			<table class="answers">
				<caption>
					Baseline labels against the analyst label for this roster. Agreement measures rubric
					alignment, not baseball truth.
				</caption>
				<thead>
					<tr>
						<th scope="col">Player</th>
						<th scope="col">Analyst label</th>
						<th scope="col">Baseline label</th>
						<th scope="col">Rules fired</th>
						<th scope="col">Outcome</th>
					</tr>
				</thead>
				<tbody>
					{#each baselineRows as row (row.id)}
						<tr>
							<th scope="row">{names.get(row.id)}</th>
							<td>{row.analyst ?? '—'}</td>
							<td>
								{row.result?.label ?? '—'}
								{#if row.result?.abstained}
									<small>{row.result.reason}</small>
								{/if}
							</td>
							<td class="options">
								{#each row.result?.firedRules ?? [] as fired (fired)}
									<span class="option">{fired}</span>
								{/each}
							</td>
							<td>{baselineOutcome(row)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="cost">
			{baselineSummary.matched} of {baselineSummary.compared} labeled players matched ·
			{baselineSummary.abstained} abstained ({(baselineSummary.abstentionCoverage * 100).toFixed(
				0
			)}%) · Diamond cut: median 2026 season R/PA {medianRate === null
				? 'unavailable'
				: medianRate.toFixed(6)}
			of the labeled players
		</p>
		<p class="limits">
			Recorded interpretations (D-55): a Square "full workload" is 300+ plate appearances and "no
			large split gap" is under the Star rule's .200 OPS; Circle reads "no everyday slot" as
			multi-position eligibility under Rectangle volume; Diamond's rate is above the median of the
			labeled players' 2026 season rates, and under 100 plate appearances the fringe rule governs
			instead. Pre-2026 storylines supply a 2025-dated rate against that 2026 cut — each row's rate
			label names the vintage. Pentagon and Octagon are never mechanically evaluable from these
			sources — {UNEVALUABLE_LABELS.map(({ label }) => label).join(' and ')} therefore have no baseline
			coverage. SPEC §7 deviations, recorded in D-55: no held-out split at this sample size with fixed
			rules, and Brier and reliability scores need probabilistic outputs, so they wait for the Jev evaluation.
		</p>
	</section>
</div>

<style>
	.snapshots {
		display: grid;
		gap: 2rem;
		max-width: 88rem;
		margin: 0 auto;
		padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem;
	}
	.lead {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 24rem;
		gap: 2.5rem;
		align-items: start;
	}
	h1 {
		margin: 0.5rem 0 0;
		font-family: var(--display);
		font-size: clamp(2rem, 4.5vw, 3.25rem);
		font-weight: 400;
		line-height: 1;
		text-wrap: balance;
	}
	h2 {
		margin: 0;
		font-family: var(--display);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		font-weight: 400;
		letter-spacing: 0.04em;
	}
	.back {
		color: var(--marker);
		font: 500 0.8rem var(--mono);
		text-decoration: none;
	}
	.lede {
		max-width: 68ch;
		margin: 0.75rem 0 0;
		color: var(--ink-soft);
		line-height: 1.6;
	}
	.boundary {
		display: grid;
		gap: 0.75rem;
		border: 1px solid var(--marker);
		border-radius: 10px;
		padding: 1rem;
		background: var(--panel);
		font-size: 0.85rem;
		line-height: 1.55;
	}
	.boundary p {
		margin: 0;
		color: var(--ink-soft);
	}
	.boundary strong {
		color: var(--ink);
	}
	.scenario-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.scenario {
		min-height: 2.5rem;
		border: 1px solid var(--rule);
		border-radius: 8px;
		padding: 0.45rem 0.85rem;
		color: var(--ink);
		background: var(--panel);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.scenario[aria-pressed='true'] {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}
	.snapshots > *,
	.split > * {
		min-width: 0;
	}
	.table-scroll {
		max-width: 100%;
		overflow-x: auto;
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 2rem;
		align-items: start;
	}
	.roster,
	.prompt,
	.outputs,
	.baseline {
		display: grid;
		gap: 1rem;
	}
	.prompt,
	.outputs,
	.baseline {
		border: 1px solid var(--rule);
		border-radius: 12px;
		padding: 1.25rem;
		background: var(--panel);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	label {
		color: var(--ink-soft);
		font: 500 0.75rem var(--mono);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	select {
		min-height: 2.5rem;
		border: 1px solid var(--rule-strong);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		font: inherit;
		font-size: 0.9rem;
	}
	.request-note,
	.limits,
	.cost,
	.fit-note {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.6;
	}
	.state {
		margin: 0;
		border-left: 4px solid var(--rule-strong);
		padding: 0.6rem 0.85rem;
		background: var(--chip-bg);
		font-size: 0.85rem;
		line-height: 1.55;
	}
	.status-line {
		min-height: 1.4rem;
		margin: 0;
		font: 500 0.8rem var(--mono);
	}
	button {
		min-height: 2.5rem;
		border: 1px solid var(--rule-strong);
		border-radius: 6px;
		padding: 0.45rem 0.85rem;
		color: var(--ink);
		background: var(--panel);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}
	button:disabled {
		color: var(--ink-soft);
		background: var(--chip-bg);
		cursor: not-allowed;
	}
	.request-toggle {
		border: 1px solid var(--rule);
		border-radius: 8px;
		background: var(--panel);
	}
	.request-toggle summary {
		padding: 0.5rem 0.75rem;
		font: 500 0.8rem var(--mono);
		cursor: pointer;
	}
	.request-toggle[open] summary {
		border-bottom: 1px solid var(--rule);
	}
	pre {
		max-height: 26rem;
		margin: 0;
		overflow: auto;
		padding: 0.75rem;
		background: var(--chip-bg);
		font: 400 0.75rem var(--mono);
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	caption {
		margin-bottom: 0.5rem;
		color: var(--ink-soft);
		font-size: 0.8rem;
		text-align: left;
	}
	th,
	td {
		border-bottom: 1px solid var(--rule);
		padding: 0.45rem 0.5rem;
		text-align: left;
		vertical-align: top;
	}
	thead th {
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.slot {
		display: block;
		font-size: 0.85rem;
	}
	.slot small {
		color: var(--ink-soft);
		font: 400 0.72rem var(--mono);
	}
	.fit {
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
		text-transform: uppercase;
	}
	.options .option {
		display: block;
		font: 400 0.75rem var(--mono);
	}
	td small {
		display: block;
		color: var(--ink-soft);
		font: 400 0.72rem var(--mono);
	}
	@media (max-width: 1100px) {
		.lead,
		.split {
			grid-template-columns: 1fr;
		}
	}
</style>
