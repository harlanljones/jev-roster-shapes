<svelte:options namespace="svg" />

<script lang="ts">
	import { axisExtents, shapePath } from '$lib/shapes/geometry';
	import { SLOT_ROLES, savantColor, sideOf, splitScale, type CasePlayer } from '../shape-case';

	// One player piece: the rubric shape at an area set by runs, split down the
	// middle into a vs-LHP half (left) and a vs-RHP half (right). Each half is
	// scaled by that split's OPS against the player's own and colored against
	// the league line for that hand. Tabs on the sides are positions played.
	let {
		player,
		cx,
		cy,
		r,
		tabs = true,
		faded = false,
		hatch
	}: {
		player: CasePlayer;
		cx: number;
		cy: number;
		r: number;
		tabs?: boolean;
		faded?: boolean;
		/** Id of a hatch pattern in the parent SVG, for missing data. */
		hatch: string;
	} = $props();

	const uid = $props.id();
	const drawn = $derived(player.shape === 'Unclassified' ? 'Circle' : player.shape);
	const scale = $derived(splitScale(player));
	const exL = $derived(axisExtents(drawn, r * (scale?.L ?? 1)));
	const exR = $derived(axisExtents(drawn, r * (scale?.R ?? 1)));
	const tabList = $derived.by(() => {
		if (!tabs) return [];
		const pos = [...player.elig].sort(
			(a, b) =>
				SLOT_ROLES.indexOf(a as (typeof SLOT_ROLES)[number]) -
				SLOT_ROLES.indexOf(b as (typeof SLOT_ROLES)[number])
		);
		if (pos.length === 1) return [{ x: cx + exR.right - 3, label: pos[0]! }];
		if (pos.length === 2) {
			return [
				{ x: cx + exL.left - 25, label: pos[0]! },
				{ x: cx + exR.right - 3, label: pos[1]! }
			];
		}
		return [];
	});
</script>

{#if scale && player.split}
	<defs>
		<clipPath id="{uid}-L" clipPathUnits="userSpaceOnUse">
			<rect x={cx - 4000} y={cy - 4000} width="4000" height="8000" />
		</clipPath>
		<clipPath id="{uid}-R" clipPathUnits="userSpaceOnUse">
			<rect x={cx} y={cy - 4000} width="4000" height="8000" />
		</clipPath>
	</defs>
	{#each ['L', 'R'] as const as side (side)}
		{@const split = sideOf(player.split, side)}
		<path
			class="body"
			d={shapePath(drawn, cx, cy, r * scale[side])}
			fill={savantColor(split.ops, side)}
			fill-opacity={faded ? 0.62 : 1}
			stroke={split.pa < 100 ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.4)'}
			stroke-width={split.pa < 100 ? 1.5 : 1}
			stroke-dasharray={split.pa < 100 ? '4 3' : undefined}
			clip-path="url(#{uid}-{side})"
		/>
	{/each}
	<line
		x1={cx}
		y1={cy + Math.min(exL.top, exR.top)}
		x2={cx}
		y2={cy + Math.max(exL.bottom, exR.bottom)}
		stroke="rgba(0,0,0,.45)"
		stroke-width="1"
	/>
{:else if player.rate != null}
	<path
		class="body"
		d={shapePath(drawn, cx, cy, r)}
		fill="rgba(150,150,150,.25)"
		stroke="#8a938d"
		stroke-width="1.5"
		stroke-dasharray="5 4"
	/>
{:else}
	<path
		class="body"
		d={shapePath(drawn, cx, cy, r)}
		fill="url(#{hatch})"
		stroke="#c8cfca"
		stroke-width="2"
		stroke-dasharray="5 4"
	/>
{/if}
{#each tabList as tab (tab.label)}
	<rect
		x={tab.x}
		y={cy - 8}
		width="28"
		height="16"
		rx="4"
		fill="#eef0ea"
		stroke="rgba(0,0,0,.5)"
		stroke-width="1"
	/>
	<text class="tab" x={tab.x + 14} y={cy + 4} text-anchor="middle">{tab.label}</text>
{/each}

<style>
	.tab {
		fill: #1d2320;
		font-family: var(--mono);
		font-size: 10.5px;
		font-weight: 500;
	}
</style>
