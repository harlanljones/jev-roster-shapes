<script lang="ts">
	import { shapePath } from '$lib/shapes/geometry';
	import type { ShapeLabel } from '$lib/shapes/taxonomy';
	import {
		BIN_H,
		BIN_W,
		TRAY_W,
		savantColor,
		sideOf,
		type BinPiece,
		type BinResult,
		type Pool,
		type Side,
		type TrayResult
	} from '../shape-case';

	// The decision's one diagram (D-50, after the Wyman Diagram guide): the
	// roster as a puzzle board. The lineup's nine pieces drop into a board whose
	// lid is the most this pool can field, so what the shapes don't cover is
	// value lost: gaps where outlines don't nest, headroom above the pile. The
	// pieces left off the field sit in the open tray beside it at the same scale.
	let {
		pool,
		bin,
		tray,
		selected,
		onSelect,
		label
	}: {
		pool: Pool;
		bin: BinResult;
		tray: TrayResult;
		selected: string | null;
		onSelect: (playerId: string) => void;
		label: string;
	} = $props();

	const uid = $props.id();
	const X0 = 10;
	const TOP = 40;
	const GAP = 44;
	const TX = X0 + BIN_W + GAP;
	const H = $derived(Math.max(BIN_H, tray.height + 24));
	const FLOOR = $derived(TOP + H);

	function shapeFor(id: string | null): ShapeLabel {
		const shape = id ? (pool.get(id)?.shape ?? 'Circle') : 'Circle';
		return shape === 'Unclassified' ? 'Circle' : shape;
	}
	function half(pc: BinPiece, cx: number, cy: number, side: Side) {
		const id = side === 'L' ? pc.idL : pc.idR;
		const player = id ? pool.get(id) : undefined;
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
	const runsText = (v: number | null) => (v == null ? 'runs unavailable' : `${v.toFixed(1)} runs`);

	const onField = $derived(
		bin.pieces.map((pc) => {
			const cx = X0 + pc.x;
			const cy = FLOOR - pc.y;
			const id = pc.idR;
			const p = id ? pool.get(id) : undefined;
			return {
				key: pc.role,
				id,
				pc,
				cx,
				cy,
				tag: pc.role,
				name: p?.last ?? 'empty',
				L: half(pc, cx, cy, 'L'),
				R: half(pc, cx, cy, 'R'),
				aria: `${pc.role}: ${p?.name ?? 'empty'}, ${p?.shape ?? 'no shape'}, ${runsText(pc.runs)}`
			};
		})
	);
	const offField = $derived(
		tray.pieces.map((pc) => {
			const cx = TX + pc.x;
			const cy = FLOOR - pc.y;
			const p = pool.get(pc.id);
			return {
				key: pc.id,
				id: pc.id,
				pc,
				cx,
				cy,
				tag: p?.elig.length ? p.elig.join('/') : 'DH',
				name: p?.last ?? pc.id,
				L: half(pc, cx, cy, 'L'),
				R: half(pc, cx, cy, 'R'),
				aria: `Off the field: ${p?.name ?? pc.id}, ${p?.shape ?? 'no shape'}, ${runsText(pc.runs)}`
			};
		})
	);
	/** Where the pile tops out; everything between it and the lid is headroom. */
	const pileTop = $derived(FLOOR - Math.max(0, ...bin.pieces.map((pc) => pc.y + pc.box.top - 2)));

	function keySelect(event: KeyboardEvent, id: string | null): void {
		if (id && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			onSelect(id);
		}
	}
</script>

<svg class="board" viewBox="0 0 {TX + TRAY_W + X0} {TOP + H + 12}" role="group" aria-label={label}>
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
		{#each [...onField, ...offField] as { key, cx } (key)}
			<clipPath id="{uid}-{key}-L" clipPathUnits="userSpaceOnUse">
				<rect x={cx - 4000} y="-4000" width="4000" height="8000" />
			</clipPath>
			<clipPath id="{uid}-{key}-R" clipPathUnits="userSpaceOnUse">
				<rect x={cx} y="-4000" width="4000" height="8000" />
			</clipPath>
		{/each}
	</defs>

	<text class="head" x={X0} y={TOP - 14}>ON THE FIELD</text>
	<text class="head-note" x={X0 + BIN_W} y={TOP - 14} text-anchor="end">lid = this pool's best</text
	>
	<rect class="lid" x={X0} y={FLOOR - BIN_H} width={BIN_W} height={BIN_H} />
	{#if pileTop - (FLOOR - BIN_H) > 22}
		<line class="pile" x1={X0} x2={X0 + BIN_W} y1={pileTop} y2={pileTop} stroke-dasharray="6 5" />
		<text
			class="headroom"
			x={X0 + BIN_W / 2}
			y={(pileTop + FLOOR - BIN_H) / 2 + 4}
			text-anchor="middle">HEADROOM {Math.round(bin.headroom)}%</text
		>
	{/if}

	<text class="head" x={TX} y={TOP - 14}>OFF THE FIELD</text>
	<path
		class="tray"
		d="M{TX} {FLOOR - H} V{FLOOR} H{TX + TRAY_W} V{FLOOR - H}"
		stroke-dasharray="3 5"
	/>
	{#if !offField.length}
		<text class="head-note" x={TX + TRAY_W / 2} y={FLOOR - 20} text-anchor="middle"
			>nobody left off</text
		>
	{/if}

	{#each [...onField, ...offField] as piece (piece.key)}
		{@const { key, id, pc, cx, cy, L, R } = piece}
		<g
			class="piece"
			class:sel={id != null && selected === id}
			role="button"
			tabindex="0"
			aria-label={piece.aria}
			aria-pressed={id != null && selected === id}
			onclick={() => id && onSelect(id)}
			onkeydown={(e) => keySelect(e, id)}
		>
			{#each [['L', L], ['R', R]] as const as [side, h] (side)}
				<path
					class="body"
					d={h.d}
					fill={h.fill}
					stroke={h.missing ? 'var(--unknown)' : 'rgba(0,0,0,.45)'}
					stroke-width={h.missing ? 1.5 : 1}
					stroke-dasharray={h.missing ? '5 4' : undefined}
					clip-path="url(#{uid}-{key}-{side})"
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
			<text class="role" x={cx} y={cy - 4} text-anchor="middle">{piece.tag}</text>
			<text class="nm" x={cx} y={cy + 11} text-anchor="middle">{piece.name}</text>
		</g>
	{/each}
</svg>

<style>
	.board {
		display: block;
		width: 100%;
		height: auto;
	}
	.lid {
		fill: var(--panel);
		stroke: var(--ink);
		stroke-width: 2.5;
	}
	.tray {
		fill: none;
		stroke: var(--ink-soft);
		stroke-width: 2;
	}
	.pile {
		stroke: var(--marker);
		stroke-width: 1.5;
	}
	.head {
		fill: var(--ink);
		font-family: var(--display);
		font-size: 16px;
		letter-spacing: 0.08em;
	}
	.head-note {
		fill: var(--ink-soft);
		font-family: var(--mono);
		font-size: 11px;
	}
	.headroom {
		fill: var(--marker);
		font-family: var(--mono);
		font-size: 12px;
		letter-spacing: 0.1em;
	}
	.piece {
		cursor: pointer;
		outline: none;
	}
	.piece:focus-visible .body,
	.piece.sel .body {
		stroke: var(--ink);
		stroke-width: 3;
		stroke-dasharray: none;
	}
	.piece:focus-visible .body {
		stroke: var(--marker);
	}
	text {
		paint-order: stroke;
		stroke: var(--panel);
		stroke-width: 3px;
		pointer-events: none;
		font-size: 11px;
	}
	.head,
	.head-note {
		stroke: none;
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
</style>
