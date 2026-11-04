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
		gap: var(--spacing-200);
		border-radius: var(--radius-md);
		padding: var(--spacing-200);
		color: var(--ink);
		background: var(--case-100);
	}
	.who {
		display: grid;
		gap: var(--spacing-50);
	}
	.name {
		margin: 0;
		font-family: var(--font-sans);
		font-size: var(--text-2xl);
		line-height: var(--text-2xl--lh);
		font-weight: 600;
	}
	.chips {
		display: flex;
		gap: var(--spacing-75);
		margin: 0;
	}
	.chip {
		border-radius: var(--radius-md);
		padding: var(--spacing-25) var(--spacing-75);
		background: var(--case-200);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		letter-spacing: 0.02em;
	}
	.chip.snug {
		color: var(--grade-snug);
	}
	.chip.fits {
		color: var(--grade-fits);
	}
	.chip.loose {
		color: var(--grade-loose);
	}
	.chip.unknown,
	.chip.bench {
		color: var(--ink-muted);
	}
	p {
		margin: 0;
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--spacing-50) var(--spacing-200);
		margin: 0;
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	dt {
		color: var(--ink-muted);
	}
	dd {
		margin: 0;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}
	.rubric {
		color: var(--ink-muted);
	}
	.layer {
		font-weight: 600;
	}
</style>
