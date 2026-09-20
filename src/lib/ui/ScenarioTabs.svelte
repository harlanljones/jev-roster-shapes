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
		<span class="eyebrow">Scenarios</span>
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
		gap: 0.7rem;
	}

	.tabs-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.eyebrow {
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 760;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.tabs-note {
		color: var(--muted);
		font-size: 0.75rem;
	}

	.scenario-tabs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.scenario-tab {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 3.2rem;
		padding: 0.7rem 0.8rem;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		background: var(--paper-deep);
		color: var(--ink);
		font: inherit;
		font-weight: 720;
		text-align: left;
		cursor: pointer;
	}

	.scenario-tab:hover,
	.scenario-tab.active {
		border-color: var(--navy);
		background: var(--navy);
		color: var(--paper);
	}

	.tab-state {
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.68rem;
		font-weight: 560;
		opacity: 0.72;
	}

	@media (max-width: 560px) {
		.scenario-tabs {
			grid-template-columns: 1fr;
		}
	}
</style>
