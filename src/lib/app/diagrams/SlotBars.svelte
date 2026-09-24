<script lang="ts">
	import {
		CAP_RATE,
		leagueSideRate,
		savantColor,
		sideOf,
		type BarResult,
		type Pool,
		type Side
	} from '../shape-case';

	// Slot by slot (D-43): the lineup as a container. Each column is as wide as
	// the occupant's actual 2026 PA and splits at his real vs-LHP share. A band
	// fills in proportion to estimated runs per PA against that hand (a judgment
	// layer), growing out from the line between bands; full is .150 R/PA.
	let { pool, bars, px, label }: { pool: Pool; bars: BarResult; px: number; label: string } =
		$props();

	const uid = $props.id();
	const X0 = 70;
	const TOP = 30;
	const H = 250;

	const cols = $derived.by(() => {
		let x = X0;
		return bars.cells.map((c) => {
			const w = c.pa * px;
			const hL = (H * c.L.pa) / c.pa;
			const mid = TOP + hL;
			const band = (side: Side) => {
				const cell = c[side];
				const player = cell.id ? pool.get(cell.id) : undefined;
				const size = side === 'L' ? hL : H - hL;
				if (cell.runs == null) return { missing: true as const, size, player };
				const h = Math.min(size, (size * cell.runs) / (cell.pa * CAP_RATE));
				return {
					missing: false as const,
					size,
					h,
					player,
					fill: player?.split ? savantColor(sideOf(player.split, side).ops, side) : '#bbb'
				};
			};
			const col = {
				c,
				x,
				w,
				mid,
				hL,
				L: band('L'),
				R: band('R'),
				lgL: mid - (hL * leagueSideRate('L')) / CAP_RATE,
				lgR: mid + ((H - hL) * leagueSideRate('R')) / CAP_RATE,
				same: c.L.id === c.R.id
			};
			x += w;
			return col;
		});
	});
	const width = $derived(cols.reduce((s, c) => s + c.w, 0));
	const name = (id: string | null) => (id ? (pool.get(id)?.last ?? id) : 'empty');
</script>

<svg class="bars" viewBox="0 0 1000 {TOP + H + 30}" role="img" aria-label={label}>
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
	</defs>
	<rect class="frame" x={X0} y={TOP} {width} height={H} />
	<text class="sub" x={X0 - 8} y={TOP + 22} text-anchor="end">vs LHP</text>
	<text class="sub" x={X0 - 8} y={TOP + H * 0.62} text-anchor="end">vs RHP</text>
	{#each cols as col (col.c.role)}
		<text class="role" x={col.x + col.w / 2} y={TOP - 8} text-anchor="middle">{col.c.role}</text>
		{#each [['L', col.L], ['R', col.R]] as const as [side, b] (side)}
			{#if b.missing}
				<rect
					x={col.x + 3}
					y={side === 'L' ? TOP + 3 : col.mid + 1}
					width={Math.max(col.w - 6, 0)}
					height={Math.max(b.size - 4, 0)}
					fill="url(#{uid}-hatch)"
					stroke="var(--unknown)"
					stroke-width="1.5"
					stroke-dasharray="5 4"
				>
					<title>{b.player?.name ?? 'Empty'}, {col.c.role} vs {side}HP, no data</title>
				</rect>
			{:else}
				<rect
					x={col.x + 1}
					y={side === 'L' ? col.mid - b.h : col.mid}
					width={Math.max(col.w - 2, 0)}
					height={b.h}
					fill={b.fill}
					stroke="rgba(0,0,0,.45)"
					stroke-width="1"
				>
					<title
						>{b.player?.name}, {col.c.role} vs {side === 'L' ? 'left' : 'right'}-handed pitching,
						fills {Math.round((b.h / b.size) * 100)}% of the band</title
					>
				</rect>
			{/if}
		{/each}
		{#if col.same}
			<text class="nm" x={col.x + col.w / 2} y={col.mid + 18} text-anchor="middle"
				>{name(col.c.R.id)}</text
			>
		{:else}
			<text class="sub" x={col.x + col.w / 2} y={col.mid - 8} text-anchor="middle"
				>{name(col.c.L.id)}</text
			>
			<text class="nm" x={col.x + col.w / 2} y={col.mid + 18} text-anchor="middle"
				>{name(col.c.R.id)}</text
			>
		{/if}
		{#if col.x > X0}
			<line class="rule" x1={col.x} y1={TOP} x2={col.x} y2={TOP + H} />
		{/if}
		<line class="midline" x1={col.x} y1={col.mid} x2={col.x + col.w} y2={col.mid} />
		<line class="league" x1={col.x} y1={col.lgL} x2={col.x + col.w} y2={col.lgL} />
		<line class="league" x1={col.x} y1={col.lgR} x2={col.x + col.w} y2={col.lgR} />
		<text class="sub" x={col.x + col.w / 2} y={TOP + H + 16} text-anchor="middle"
			>{Math.round(col.c.pa)} PA</text
		>
	{/each}
	<text class="sub" x={X0 + width + 10} y={TOP + 12}>dotted:</text>
	<text class="sub" x={X0 + width + 10} y={TOP + 26}>lg avg</text>
	<text class="sub" x={X0 + width + 10} y={TOP + 40}
		>{leagueSideRate('L').toFixed(3).slice(1)} / {leagueSideRate('R').toFixed(3).slice(1)}</text
	>
</svg>

<style>
	.bars {
		display: block;
		width: 100%;
		height: auto;
	}
	.frame {
		fill: var(--panel);
		stroke: var(--ink-soft);
		stroke-width: 2;
	}
	.rule {
		stroke: var(--rule);
		stroke-width: 1;
	}
	.midline {
		stroke: var(--ink-soft);
		stroke-width: 1;
		stroke-dasharray: 4 4;
	}
	.league {
		stroke: var(--ink);
		stroke-width: 1.5;
		stroke-dasharray: 1.5 4;
		stroke-linecap: round;
	}
	text {
		paint-order: stroke;
		stroke: var(--panel);
		stroke-width: 3px;
		pointer-events: none;
	}
	.role {
		fill: var(--ink-soft);
		font-family: var(--mono);
		font-size: 11px;
		letter-spacing: 0.08em;
	}
	.nm {
		fill: var(--ink);
		font-family: var(--body);
		font-size: 12px;
		font-weight: 600;
	}
	.sub {
		fill: var(--ink-soft);
		font-family: var(--mono);
		font-size: 10.5px;
	}
</style>
