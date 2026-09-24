<script lang="ts">
	import { shapePath } from '$lib/shapes/geometry';
	import type { ShapeLabel } from '$lib/shapes/taxonomy';
	import {
		BIN_H,
		BIN_W,
		savantColor,
		sideOf,
		type BinPiece,
		type BinResult,
		type Pool,
		type Side
	} from '../shape-case';

	// What's left off (D-43): one lineup's nine slots dropped into a fixed bin
	// by gravity, biggest first. Area is runs; the lid is where the pool's
	// tightest fit tops out. Gaps are space lost where outlines don't nest;
	// headroom is value this lineup leaves off.
	let { pool, bin, label }: { pool: Pool; bin: BinResult; label: string } = $props();

	const uid = $props.id();
	const X0 = 10;
	const TOP = 10;
	const FLOOR = TOP + BIN_H;

	function shapeFor(id: string | null): ShapeLabel {
		const shape = id ? (pool.get(id)?.shape ?? 'Circle') : 'Circle';
		return shape === 'Unclassified' ? 'Circle' : shape;
	}
	function half(pc: BinPiece, side: Side) {
		const id = side === 'L' ? pc.idL : pc.idR;
		const player = id ? pool.get(id) : undefined;
		const cx = X0 + pc.x;
		const cy = FLOOR - pc.y;
		if (pc.runs == null) {
			return {
				d: shapePath(shapeFor(id), cx, cy, pc.r),
				fill: `url(#${uid}-hatch)`,
				missing: true
			};
		}
		const k = side === 'L' ? pc.kL : pc.kR;
		return {
			d: shapePath(shapeFor(id), cx, cy, pc.r * k),
			fill: player?.split ? savantColor(sideOf(player.split, side).ops, side) : '#bbb',
			missing: false
		};
	}
	const name = (id: string | null) => (id ? (pool.get(id)?.last ?? id) : 'empty');
	const pieces = $derived(
		bin.pieces.map((pc) => ({
			pc,
			cx: X0 + pc.x,
			cy: FLOOR - pc.y,
			L: half(pc, 'L'),
			R: half(pc, 'R'),
			same: pc.idL === pc.idR,
			title: `${pc.role}: ${pc.idL === pc.idR ? (pool.get(pc.idR ?? '')?.name ?? 'empty') : `${pool.get(pc.idL ?? '')?.name ?? 'empty'} vs left-handers, ${pool.get(pc.idR ?? '')?.name ?? 'empty'} vs right-handers`}, ${pc.runs == null ? 'no data' : `about ${pc.runs.toFixed(1)} runs`}`
		}))
	);
</script>

<svg class="bin" viewBox="0 0 {BIN_W + 2 * X0} {BIN_H + 2 * TOP}" role="img" aria-label={label}>
	<defs>
		<pattern
			id="{uid}-hatch"
			width="8"
			height="8"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(45)"
		>
			<line x1="0" y1="0" x2="0" y2="8" stroke="var(--unknown)" stroke-width="1.5" opacity="0.5" />
		</pattern>
		{#each pieces as { pc, cx } (pc.role)}
			<clipPath id="{uid}-{pc.role}-L" clipPathUnits="userSpaceOnUse">
				<rect x={cx - 4000} y="-4000" width="4000" height="8000" />
			</clipPath>
			<clipPath id="{uid}-{pc.role}-R" clipPathUnits="userSpaceOnUse">
				<rect x={cx} y="-4000" width="4000" height="8000" />
			</clipPath>
		{/each}
	</defs>
	<rect class="lid" x={X0} y={TOP} width={BIN_W} height={BIN_H} />
	{#each pieces as { pc, cx, cy, L, R, same, title } (pc.role)}
		<g>
			<title>{title}</title>
			{#each [['L', L], ['R', R]] as const as [side, h] (side)}
				<path
					d={h.d}
					fill={h.fill}
					stroke={h.missing ? 'var(--unknown)' : 'rgba(0,0,0,.45)'}
					stroke-width={h.missing ? 1.5 : 1}
					stroke-dasharray={h.missing ? '5 4' : undefined}
					clip-path="url(#{uid}-{pc.role}-{side})"
				/>
			{/each}
			<line
				x1={cx}
				y1={cy - pc.box.top + 4}
				x2={cx}
				y2={cy + pc.box.bottom - 4}
				stroke="rgba(0,0,0,.35)"
				stroke-width="1"
			/>
			<text class="role" x={cx} y={cy - 4} text-anchor="middle">{pc.role}</text>
			{#if same}
				<text class="nm" x={cx} y={cy + 11} text-anchor="middle">{name(pc.idR)}</text>
			{:else}
				<text class="sub" x={cx} y={cy + 10} text-anchor="middle">{name(pc.idL)} L</text>
				<text class="sub" x={cx} y={cy + 23} text-anchor="middle">{name(pc.idR)} R</text>
			{/if}
		</g>
	{/each}
</svg>

<style>
	.bin {
		display: block;
		width: 100%;
		height: auto;
	}
	.lid {
		fill: var(--panel);
		stroke: var(--ink-soft);
		stroke-width: 2;
	}
	text {
		paint-order: stroke;
		stroke: var(--panel);
		stroke-width: 3px;
		pointer-events: none;
		font-size: 11px;
	}
	.role {
		fill: var(--ink-soft);
		font-family: var(--mono);
		letter-spacing: 0.08em;
	}
	.nm {
		fill: var(--ink);
		font-family: var(--body);
		font-weight: 600;
	}
	.sub {
		fill: var(--ink-soft);
		font-family: var(--mono);
	}
</style>
