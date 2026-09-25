<script lang="ts">
	import {
		CUTOUT_ASK,
		GRADE_TEXT,
		complements,
		grade,
		splitText,
		type Pool,
		type Role
	} from '../shape-case';

	// The tag on the selected piece: what its cutout asks for, what shape it
	// is, and the evidence behind its size and halves.
	let { pool, playerId, role }: { pool: Pool; playerId: string; role: Role | undefined } = $props();

	const p = $derived(pool.get(playerId));
	const g = $derived(p && role ? grade(p, role) : null);
	const pairs = $derived(complements(pool).filter((c) => c.vsL === playerId || c.vsR === playerId));
	const last = (id: string) => pool.get(id)?.last ?? id;
</script>

{#if p}
	<div class="tag">
		<div class="who">
			<h2 class="name">{p.name}</h2>
			<p class="chips">
				<span class="chip {g ?? 'bench'}">{g ? GRADE_TEXT[g] : 'In tray'}</span>
				<span class="chip">{p.shape}</span>
			</p>
		</div>
		<p>
			{#if role}
				The {role} cutout asks for a <b>{CUTOUT_ASK[role].primary}</b> ({CUTOUT_ASK[role].why}).
				{p.name.split(' ')[0]} is a <b>{p.shape}</b>.
			{:else}
				No lineup slot in this scenario. Eligible at {p.elig.length
					? p.elig.join(', ')
					: 'no position (DH only)'}.
			{/if}
		</p>
		<dl>
			<dt>Bats</dt>
			<dd>{p.bats}</dd>
			<dt>Eligible</dt>
			<dd>{p.elig.length ? p.elig.join(' · ') : 'none'}</dd>
			<dt>R/PA known then</dt>
			<dd>{p.rateText ?? 'unavailable'}</dd>
			<dt>2026 season R/PA</dt>
			<dd>{p.seasonRateText ?? 'no 2026 PA'}</dd>
			<dt>Split OPS</dt>
			<dd>{splitText(p)}</dd>
			<dt>Platoon fit</dt>
			<dd>
				{pairs.length
					? pairs
							.map((c) =>
								c.vsL === playerId
									? `vs LHP half of a pair with ${last(c.vsR)} (${c.at.join('/')})`
									: `vs RHP half of a pair with ${last(c.vsL)} (${c.at.join('/')})`
							)
							.join('; ')
					: 'no complement in the pool'}
			</dd>
			<dt>2026 PA</dt>
			<dd>
				{#if p.split}{Math.round(p.pa.L + p.pa.R)} ({Math.round(p.pa.L)} vs LHP · {Math.round(
						p.pa.R
					)} vs RHP){:else}unavailable{/if}
			</dd>
			<dt>2026 runs (PA × season rate)</dt>
			<dd>{p.runs == null ? 'unavailable' : p.runs.toFixed(1)}</dd>
		</dl>
		<p class="rubric"><span class="layer">Rubric note.</span> {p.rationale}</p>
	</div>
{/if}

<style>
	.tag {
		display: grid;
		gap: 0.9rem;
		border-radius: 12px;
		padding: 1.25rem;
		color: #18201c;
		background: #eef0ea;
		box-shadow: 0 1px 2px rgb(22 32 42 / 10%);
	}
	.who {
		display: grid;
		gap: 0.35rem;
	}
	.name {
		margin: 0;
		font-family: var(--body);
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.15;
	}
	.chips {
		display: flex;
		gap: 0.4rem;
		margin: 0;
	}
	.chip {
		border-radius: 4px;
		padding: 0.1rem 0.45rem;
		background: #dfe3dd;
		font-family: var(--mono);
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.chip.snug {
		color: #1f6b41;
	}
	.chip.fits {
		color: #7a520b;
	}
	.chip.loose {
		color: #a3221b;
	}
	.chip.unknown,
	.chip.bench {
		color: #4d5751;
	}
	p {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.5;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.35rem 0.9rem;
		margin: 0;
		font-size: 0.8rem;
	}
	dt {
		color: #4d5751;
	}
	dd {
		margin: 0;
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
	}
	.rubric {
		color: #4d5751;
	}
	.layer {
		font-weight: 600;
	}
</style>
