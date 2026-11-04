<script lang="ts">
	import { SPLIT_STEPS } from '../shape-case';
	import { LEAGUE_OPS } from '../split-evidence';

	// D-62: the split axis as seven discrete steps with a grey midpoint at the league line.
	// The legend says plainly that colour is a rating here, which inverts the original
	// framework's rule that colour carries role and is not a rating.
	let { compact = false }: { compact?: boolean } = $props();
	const lg = (v: number) => v.toFixed(3).slice(1);
</script>

<div class="legend">
	<ol class="steps" aria-label="Split colour steps">
		{#each SPLIT_STEPS as step (step.token)}
			<li style:background="var(--{step.token})" title={step.label}>
				<span class="visually-hidden">{step.label}</span>
			</li>
		{/each}
	</ol>
	<p class="ends"><span>Below the league line</span><span>Above</span></p>
	<p class="league">League line: {lg(LEAGUE_OPS.L)} vs LHP, {lg(LEAGUE_OPS.R)} vs RHP</p>
	{#if !compact}
		<p class="note">
			Colour is each half’s split OPS against the league line for that hand, in steps of .043 — a
			rating, unlike the original roster shapes framework, where colour means role.
		</p>
	{/if}
</div>

<style>
	.legend {
		display: grid;
		gap: var(--spacing-75);
		margin: 0;
	}
	.steps {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: var(--spacing-25);
		max-width: 20rem;
		height: 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.steps li:first-child {
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
	}
	.steps li:last-child {
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}
	.ends {
		display: flex;
		margin: 0;
		justify-content: space-between;
		gap: var(--spacing-200);
		max-width: 20rem;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.league {
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.note {
		max-width: var(--measure);
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
</style>
