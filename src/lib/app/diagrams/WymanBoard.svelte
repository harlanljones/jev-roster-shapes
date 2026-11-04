<script lang="ts">
	import { shapePath } from '$lib/shapes/geometry';
	import type { ShapeLabel } from '$lib/shapes/taxonomy';
	import {
		BIN_H,
		BIN_W,
		TRAY_W,
		splitColor,
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
		label,
		ringed = new Set<string>(),
		fit = false
	}: {
		pool: Pool;
		bin: BinResult;
		tray: TrayResult;
		selected: string | null;
		onSelect: (playerId: string) => void;
		label: string;
		/** Players to ring: the sources disagree on their shape (D-57). */
		ringed?: ReadonlySet<string>;
		/** Scale the drawing to its panel instead of scrolling sideways (the overview hero). */
		fit?: boolean;
	} = $props();

	const uid = $props.id();
	/** Narrowest the drawing is allowed to render; below it the panel scrolls sideways. */
	const MIN_DRAW_W = 600;
	let panelW = $state(0);
	const X0 = 10;
	const TOP = 40;
	const GAP = 44;
	const TX = X0 + BIN_W + GAP;
	const H = $derived(Math.max(BIN_H, tray.height + 24));
	const FLOOR = $derived(TOP + H);
	const VB_W = TX + TRAY_W + X0;
	const minW = $derived(fit ? 0 : MIN_DRAW_W);
	// Until the panel is measured, a fitted board draws at its natural width rather than at zero,
	// so the first pass never works out labels for an empty drawing.
	const drawW = $derived(fit && panelW === 0 ? VB_W : Math.max(panelW, minW));
	const scrolls = $derived(panelW > 0 && panelW < minW);
	/** Pixels per drawing unit, so in-piece text can hold a readable size on screen. */
	const unit = $derived(drawW / VB_W);
	const FS = $derived(Math.max(11, 10.5 / unit));
	/** Drawn this small, the 12px notes inside the SVG would fall under 9px on screen, so the
	 * headings, the lid note and the headroom figure move into an HTML caption above it. */
	const compact = $derived(unit < 0.75);
	/** The band above TOP holds the in-drawing headings; with those in the caption, the drawing
	 * starts just above the lid and tray instead of leaving the band empty. */
	const Y0 = $derived(compact ? TOP - 6 : 0);

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
			fill: player?.split ? splitColor(sideOf(player.split, side).ops, side) : 'var(--unknown)',
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
	/**
	 * In-piece labels are drawn only where they fit inside the piece and clear
	 * of every larger label already placed; the rest are offered as tappable
	 * chips under the board so no name is lost to a collision.
	 */
	const labelled = $derived.by(() => {
		const all = [...onField, ...offField];
		const shown: string[] = [];
		const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
		const order = [...all].sort((a, b) => b.pc.area - a.pc.area);
		for (const piece of order) {
			const w = Math.max(piece.name.length * 0.62, piece.tag.length * 0.66) * FS + 4;
			const rect = {
				x0: piece.cx - w / 2,
				x1: piece.cx + w / 2,
				y0: piece.cy - FS - 4,
				y1: piece.cy + FS * 0.45 + 6
			};
			const fits =
				w <= piece.pc.box.left + piece.pc.box.right &&
				rect.y1 - rect.y0 <= piece.pc.box.top + piece.pc.box.bottom;
			const clear = placed.every(
				(o) => rect.x1 <= o.x0 || o.x1 <= rect.x0 || rect.y1 <= o.y0 || o.y1 <= rect.y0
			);
			if (fits && clear) {
				shown.push(piece.key);
				placed.push(rect);
			}
		}
		return shown;
	});
	const unlabelled = $derived(
		panelW === 0
			? []
			: [...onField, ...offField].filter((p) => p.id != null && !labelled.includes(p.key))
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

<!-- The caption and the drawing stay one unit, so a parent grid gap never opens between them. -->
<div class="board-unit">
	{#if compact}
		<p class="board-caption">
			<span>On the field (lid = this pool's best)</span>
			{#if pileTop - (FLOOR - BIN_H) > 22}<span class="caption-headroom"
					>Headroom {Math.round(bin.headroom)}%</span
				>{/if}
			<span>Off the field{offField.length ? '' : ': nobody left off'}</span>
		</p>
	{/if}
	<div class="panel" class:scrolls bind:clientWidth={panelW}>
		<svg
			class="board"
			viewBox="0 {Y0} {VB_W} {TOP + H + 12 - Y0}"
			style:width="{drawW}px"
			style:--fs="{FS}px"
			role="group"
			aria-label={label}
		>
			<defs>
				<pattern
					id="{uid}-hatch"
					width="8"
					height="8"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(45)"
				>
					<line
						x1="0"
						y1="0"
						x2="0"
						y2="8"
						stroke="var(--unknown)"
						stroke-width="1.5"
						opacity="0.5"
					/>
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

			{#if !compact}
				<text class="head" x={X0} y={TOP - 14}>On the field</text>
				<text class="head-note" x={X0 + BIN_W} y={TOP - 14} text-anchor="end"
					>lid = this pool's best</text
				>
			{/if}
			<rect class="lid" x={X0} y={FLOOR - BIN_H} width={BIN_W} height={BIN_H} />
			{#if pileTop - (FLOOR - BIN_H) > 22}
				<line
					class="pile"
					x1={X0}
					x2={X0 + BIN_W}
					y1={pileTop}
					y2={pileTop}
					stroke-dasharray="6 5"
				/>
				{#if !compact}
					<text
						class="headroom"
						x={X0 + BIN_W / 2}
						y={(pileTop + FLOOR - BIN_H) / 2 + 4}
						text-anchor="middle">Headroom {Math.round(bin.headroom)}%</text
					>
				{/if}
			{/if}

			{#if !compact}<text class="head" x={TX} y={TOP - 14}>Off the field</text>{/if}
			<path
				class="tray"
				d="M{TX} {FLOOR - H} V{FLOOR} H{TX + TRAY_W} V{FLOOR - H}"
				stroke-dasharray="3 5"
			/>
			{#if !offField.length && !compact}
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
							stroke={h.missing ? 'var(--unknown)' : 'var(--ink)'}
							stroke-opacity={h.missing ? 1 : 0.45}
							stroke-width={h.missing ? 1.5 : 1}
							stroke-dasharray={h.missing ? '5 4' : undefined}
							clip-path="url(#{uid}-{key}-{side})"
						/>
					{/each}
					{#if id != null && ringed.has(id)}
						<path class="ring" d={shapePath(shapeFor(id), cx, cy, pc.r)} />
					{/if}
					<line
						x1={cx}
						y1={cy - pc.box.top + 4}
						x2={cx}
						y2={cy + pc.box.bottom - 4}
						stroke="var(--ink)"
						stroke-opacity="0.35"
						stroke-width="1"
					/>
					{#if labelled.includes(key)}
						<text class="role" x={cx} y={cy - 4} text-anchor="middle">{piece.tag}</text>
						<text class="nm" x={cx} y={cy + FS} text-anchor="middle">{piece.name}</text>
					{/if}
				</g>
			{/each}
		</svg>
	</div>
</div>
{#if scrolls}
	<p class="hint">Scroll the board sideways. Tap a piece to read its tag.</p>
{/if}
{#if unlabelled.length}
	<ul class="chips" aria-label="Pieces too small to label on the board">
		{#each unlabelled as piece (piece.key)}
			<li>
				<button
					type="button"
					class="chip"
					aria-pressed={selected === piece.id}
					onclick={() => piece.id && onSelect(piece.id)}
					><span>{piece.tag}</span> {piece.name}</button
				>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.board-unit {
		display: grid;
		gap: var(--spacing-75);
		min-width: 0;
	}
	.board-caption {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--spacing-50) var(--spacing-200);
		margin: 0;
		color: var(--ink);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
	.caption-headroom {
		color: var(--turf);
		font-family: var(--font-mono);
	}
	.panel {
		min-width: 0;
		overflow-x: auto;
	}
	.board {
		display: block;
		max-width: none;
		height: auto;
	}
	.hint {
		margin: var(--spacing-75) 0 0;
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-75);
		margin: var(--spacing-75) 0 0;
		padding: 0;
		list-style: none;
	}
	.chip {
		min-height: 2.25rem;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-full);
		padding: 0 var(--spacing-100);
		color: var(--ink);
		background: var(--case-100);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		cursor: pointer;
	}
	.chip span {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
	}
	.chip[aria-pressed='true'] {
		border-color: var(--ink);
		outline: 2px solid var(--focus);
	}
	.lid {
		fill: var(--case-100);
		stroke: var(--ink);
		stroke-width: 2.5;
	}
	.tray {
		fill: none;
		stroke: var(--ink-muted);
		stroke-width: 2;
	}
	.pile {
		stroke: var(--turf);
		stroke-width: 1.5;
	}
	.head {
		fill: var(--ink);
		font-family: var(--font-sans);
		font-size: var(--text-base);
		letter-spacing: 0.02em;
	}
	.head-note {
		fill: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}
	.headroom {
		fill: var(--turf);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.02em;
	}
	.piece {
		cursor: pointer;
		outline: none;
	}
	/* The body's resting outline is translucent through a stroke-opacity attribute; the focus
	   ring and the selection must draw at full strength (3:1 against the lid). */
	.piece:focus-visible .body,
	.piece.sel .body {
		stroke: var(--ink);
		stroke-width: 3;
		stroke-dasharray: none;
		stroke-opacity: 1;
	}
	.ring {
		fill: none;
		stroke: var(--turf);
		stroke-width: 2.5;
		stroke-dasharray: 6 4;
		pointer-events: none;
	}
	.piece:focus-visible .body {
		stroke: var(--turf);
	}
	/* Labels straddle two split fills, so no single ink reads on every pair: a halo in the
	   panel colour keeps them legible over any fill, in either theme. */
	text {
		paint-order: stroke;
		stroke: var(--case-100);
		stroke-width: 3px;
		stroke-linejoin: round;
		pointer-events: none;
		font-size: var(--fs, 11px);
	}
	.head,
	.head-note {
		stroke: none;
	}
	.role {
		fill: var(--ink-muted);
		font-family: var(--font-mono);
	}
	.nm {
		fill: var(--ink);
		font-family: var(--font-sans);
		font-weight: 600;
	}
</style>
