<script lang="ts">
	import type { Finding } from '../shape-case';

	// Findings under a diagram, in the three reads the Shape Case uses: where
	// the empty space is, what fits, and what grinds.
	let {
		groups,
		columns = true
	}: {
		groups: {
			title: string;
			tone: 'empty' | 'nice' | 'friction';
			items: Finding[];
			none: string;
		}[];
		columns?: boolean;
	} = $props();
</script>

<div class="findings" class:columns>
	{#each groups as group (group.title)}
		<div class="find {group.tone}">
			<h3>{group.title}</h3>
			{#if group.items.length}
				<ul>
					{#each group.items as item, i (i)}
						<li>
							<b>{item.lead}</b>
							{item.text}
							{#if item.grade}<span class="chip {item.grade}">{item.grade}</span>{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p>{group.none}</p>
			{/if}
		</div>
	{/each}
</div>

<style>
	.findings {
		display: grid;
		gap: var(--spacing-300);
	}
	.findings.columns {
		grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
		gap: var(--spacing-400);
	}
	.find {
		border-top: 1px solid var(--case-300);
		padding-top: var(--spacing-100);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
	.find.empty {
		border-top-color: var(--unknown);
	}
	.find.nice {
		border-top-color: var(--grade-snug);
	}
	.find.friction {
		border-top-color: var(--grade-fits);
	}
	h3 {
		margin: 0 0 var(--spacing-75);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 600;
	}
	ul {
		display: grid;
		gap: var(--spacing-75);
		margin: 0;
		padding-left: var(--spacing-200);
	}
	b {
		font-weight: 600;
	}
	p {
		margin: 0;
		color: var(--ink-muted);
	}
	.chip {
		display: inline-block;
		border-radius: var(--radius-md);
		padding: 0 var(--spacing-75);
		background: var(--case-200);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		letter-spacing: 0.02em;
	}
	.chip.fits {
		color: var(--grade-fits);
	}
	.chip.loose {
		color: var(--grade-loose);
	}
</style>
