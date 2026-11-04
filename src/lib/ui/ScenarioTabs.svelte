<script lang="ts">
	import type { ScenarioView, UiScenarioId } from './types';

	let {
		scenarios,
		activeScenarioId,
		onScenarioChange = () => {}
	}: {
		scenarios: readonly ScenarioView[];
		activeScenarioId: UiScenarioId;
		onScenarioChange?: (scenarioId: UiScenarioId) => void;
	} = $props();

	function moveTab(event: KeyboardEvent, index: number): void {
		if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		const tabList = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
		if (!tabList) return;
		const tabs = Array.from(tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
		if (tabs.length === 0) return;
		const nextIndex =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? tabs.length - 1
					: (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
		tabs[nextIndex]?.focus();
		const nextScenario = scenarios[nextIndex];
		if (nextScenario) onScenarioChange(nextScenario.id);
	}
</script>

<div class="tabs-wrap">
	<div class="tabs-heading">
		<span class="label">Scenarios</span>
		<span class="tabs-note">same assumptions · separate allocations</span>
	</div>
	<div class="scenario-tabs" role="tablist" aria-label="Comparison scenarios">
		{#each scenarios as scenario, index (scenario.id)}
			<button
				class:active={scenario.id === activeScenarioId}
				class="scenario-tab"
				type="button"
				role="tab"
				aria-selected={scenario.id === activeScenarioId}
				aria-controls={`scenario-panel-${scenario.id}`}
				tabindex={scenario.id === activeScenarioId ? 0 : -1}
				onclick={() => onScenarioChange(scenario.id)}
				onkeydown={(event) => moveTab(event, index)}
			>
				<span>{scenario.label}</span>
				<span class="tab-state">{scenario.unsaved ? 'Draft' : `r${scenario.revision}`}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.tabs-wrap {
		display: grid;
		gap: var(--spacing-100);
	}

	.tabs-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--spacing-200);
	}

	.label {
		color: var(--ink);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 600;
	}

	.tabs-note {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.scenario-tabs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--spacing-75);
	}

	.scenario-tab {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-75);
		min-height: 3.2rem;
		padding: var(--spacing-100) var(--spacing-100);
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		background: var(--case-200);
		color: var(--ink);
		font: inherit;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}

	/* Hover shifts the ground; only the active tab takes the accent fill. */
	.scenario-tab:hover {
		border-color: var(--turf);
		background: var(--turf-soft);
	}

	.scenario-tab.active {
		border-color: var(--turf);
		background: var(--turf);
		color: var(--on-turf);
	}

	.tab-state {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
	}

	.active > .tab-state {
		color: var(--on-turf);
	}

	@media (max-width: 560px) {
		.scenario-tabs {
			grid-template-columns: 1fr;
		}
	}
</style>
