<script lang="ts">
	import type { PoolFitScenarioFit } from '$lib/engine';
	import { SLOT_ROLES } from '../shape-case';

	// The engine's pool fit, rendered (D-45). This is the analysis artifact, not
	// the D-43 display fit: the lineup was chosen by the engine from the bundle's
	// dated metric, then judged by the same feasibility, coverage, and cap rules
	// as any other scenario. Every quantity here is also in the tables below, so
	// the panel needs no color to be read.
	let {
		fit,
		nameOf,
		label
	}: {
		fit: PoolFitScenarioFit;
		nameOf: (playerId: string) => string;
		label: string;
	} = $props();

	const runs = (value: string | null) => (value === null ? 'unavailable' : `${value} runs`);
	const delta = (value: string | null) => {
		if (value === null) return 'Δ unavailable';
		const numeric = Number(value);
		return `Δ ${numeric >= 0 ? '+' : '−'}${Math.abs(numeric).toFixed(3)}`;
	};
	const groupedMoves = $derived(
		fit.moves.reduce<Map<string, string>>((grouped, move) => {
			const key = `${move.playerId}|${move.from}->${move.to}`;
			grouped.set(key, `${move.from} → ${move.to}`);
			return grouped;
		}, new Map())
	);
</script>

<section class="fit" aria-label={label}>
	<div class="headline">
		<div>
			<h3>Pool's tightest fit · engine</h3>
			<p class="sub">
				The best nine this roster can field, searched per pitcher-hand context and judged by the
				engine. Dated rates, not hindsight; feasibility <span class="state">{fit.feasibility}</span
				>.
			</p>
		</div>
		<dl class="numbers">
			<div>
				<dt>Engine total</dt>
				<dd>{runs(fit.runs)}</dd>
			</div>
			<div>
				<dt>Left on the table</dt>
				<dd>{delta(fit.deltaVsReference?.runs ?? null)}</dd>
			</div>
			<div>
				<dt>Vs baseline fit</dt>
				<dd>{delta(fit.deltaVsBaseline?.runs ?? null)}</dd>
			</div>
		</dl>
	</div>

	<div class="contexts">
		{#each fit.contexts as context (context.templateId)}
			<table>
				<caption>
					{context.templateLabel} · {runs(context.runs)} ·
					{context.matchesReference
						? 'same nine as the lineup used'
						: 'differs from the lineup used'}
				</caption>
				<thead>
					<tr>
						<th scope="col">Slot</th>
						<th scope="col">Player</th>
						<th scope="col">PA</th>
						<th scope="col">Runs</th>
					</tr>
				</thead>
				<tbody>
					{#each context.slots as slot (slot.order)}
						<tr>
							<th scope="row">{slot.role || '—'}</th>
							<td>{slot.playerId ? nameOf(slot.playerId) : 'uncovered'}</td>
							<td>{slot.pa}</td>
							<td>{slot.runs ?? 'unavailable'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/each}
	</div>

	<div class="detail">
		<div>
			<h4>Plate-appearance transfers</h4>
			{#if fit.transfers.length === 0}
				<p class="none">Nobody gains or loses a plate appearance.</p>
			{:else}
				<ul>
					{#each fit.transfers as transfer (transfer.playerId)}
						<li>
							<span class="who">{nameOf(transfer.playerId)}</span>
							<span class="num">
								{transfer.paDelta > 0 ? '+' : '−'}{Math.abs(transfer.paDelta)} PA ({transfer.referencePA}
								→ {transfer.fitPA})
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div>
			<h4>Left on the bench</h4>
			{#if fit.bench.length === 0}
				<p class="none">Every member starts.</p>
			{:else}
				<ul>
					{#each fit.bench as member (member.playerId)}
						<li>
							<span class="who">{nameOf(member.playerId)}</span>
							<span class="num">
								{member.pa} PA in the lineup used · {runs(member.runs)} forgone
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div>
			<h4>Position moves required</h4>
			{#if groupedMoves.size === 0}
				<p class="none">None: the fit keeps every player's position.</p>
			{:else}
				<ul>
					{#each [...groupedMoves.entries()] as [key, text] (key)}
						<li>
							<span class="who">{nameOf(key.split('|')[0]!)}</span>
							<span class="num">{text}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div>
			<h4>Still uncovered</h4>
			{#if fit.shortfalls.length === 0}
				<p class="none">Every defensive position is covered in both contexts.</p>
			{:else}
				<ul>
					{#each fit.shortfalls as gap (gap.templateId + gap.position)}
						<li>
							<span class="who">{gap.position}</span>
							<span class="num">
								{gap.templateId} · {gap.shortfallOuts} outs short
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		{#if fit.excluded.length > 0}
			<div>
				<h4>Excluded for a missing rate</h4>
				<ul>
					{#each fit.excluded as member (member.playerId)}
						<li>
							<span class="who">{nameOf(member.playerId)}</span>
							<span class="num">{member.code}: {member.detail}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if fit.capPressure.length > 0}
			<div>
				<h4>At a capacity limit</h4>
				<ul>
					{#each fit.capPressure.slice(0, 4) as cap (cap.playerId + cap.field)}
						<li>
							<span class="who">{nameOf(cap.playerId)}</span>
							<span class="num">{cap.field} {cap.allocated} of {cap.limit}</span>
						</li>
					{/each}
				</ul>
				{#if fit.capPressure.length > 4}
					<p class="none">and {fit.capPressure.length - 4} more at a limit</p>
				{/if}
			</div>
		{/if}
	</div>

	<p class="footnote">
		Slots are listed in lineup order ({SLOT_ROLES.join(', ')}). The search maximizes the bundle's
		metric under eligibility and one-player-per-slot; capacity limits are applied afterwards by the
		engine, so a fit that needs more workload than a cap allows is reported infeasible rather than
		quietly replaced. Ties resolve to the lowest player IDs, so the result is reproducible from the
		pinned digest.
	</p>
</section>

<style>
	.fit {
		display: grid;
		gap: 1rem;
	}
	.headline {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.5rem;
		align-items: start;
	}
	h3 {
		margin: 0;
		font-family: var(--display);
		font-size: 1.2rem;
		font-weight: 400;
		letter-spacing: 0.04em;
	}
	h4 {
		margin: 0 0 0.35rem;
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.sub {
		max-width: 60ch;
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.state {
		font-family: var(--mono);
		font-weight: 600;
		color: var(--ink);
	}
	.numbers {
		display: flex;
		gap: 1.5rem;
		margin: 0;
	}
	dt {
		color: var(--ink-soft);
		font: 500 0.7rem var(--mono);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	dd {
		margin: 0.15rem 0 0;
		font: 600 0.95rem var(--mono);
	}
	.contexts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	caption {
		margin-bottom: 0.4rem;
		color: var(--ink-soft);
		font-size: 0.8rem;
		text-align: left;
	}
	th,
	td {
		border-bottom: 1px solid var(--rule);
		padding: 0.3rem 0.4rem;
		text-align: left;
	}
	tbody th {
		font-family: var(--mono);
		font-weight: 600;
		width: 3rem;
	}
	td:nth-child(n + 3) {
		font-family: var(--mono);
		text-align: right;
	}
	.detail {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 1rem 1.5rem;
	}
	ul {
		display: grid;
		gap: 0.2rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.85rem;
	}
	.who {
		font-weight: 600;
	}
	.num {
		color: var(--ink-soft);
		font: 400 0.75rem var(--mono);
		text-align: right;
	}
	.none,
	.footnote {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.6;
	}
	.footnote {
		border-top: 1px solid var(--rule);
		padding-top: 0.75rem;
		max-width: 90ch;
	}
	@media (max-width: 800px) {
		.headline {
			grid-template-columns: 1fr;
		}
	}
</style>
