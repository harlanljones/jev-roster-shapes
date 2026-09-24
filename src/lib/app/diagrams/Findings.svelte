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
		gap: 1.5rem;
	}
	.findings.columns {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 2rem;
	}
	.find {
		border-top: 3px solid var(--rule);
		padding-top: 0.75rem;
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.find.empty {
		border-top-color: var(--unknown);
	}
	.find.nice {
		border-top-color: var(--snug);
	}
	.find.friction {
		border-top-color: var(--fits);
	}
	h3 {
		margin: 0 0 0.6rem;
		font-size: 0.95rem;
		font-weight: 600;
	}
	ul {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding-left: 1.1rem;
	}
	b {
		font-weight: 600;
	}
	p {
		margin: 0;
		color: var(--ink-soft);
	}
	.chip {
		display: inline-block;
		border-radius: 4px;
		padding: 0 0.4rem;
		background: var(--chip-bg);
		font-family: var(--mono);
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.chip.fits {
		color: var(--fits);
	}
	.chip.loose {
		color: var(--loose);
	}
</style>
