<script lang="ts">
	import { shapePath } from '$lib/shapes/geometry';
	import {
		CUTOUT_ASK,
		GRADE_TEXT,
		caseRadius,
		grade,
		type CasePlayer,
		type CaseView,
		type Grade,
		type Pool,
		type Role
	} from '../shape-case';
	import Piece from './Piece.svelte';

	// The roster as a fitted equipment case (D-43). Each lineup slot is a foam
	// cutout cut to the profile it asks for; each player is a piece sized by
	// actual 2026 runs. Visible foam around a piece is friction; an empty
	// cutout in the tray is a position nobody on the bench covers.
	let {
		pool,
		view,
		selected,
		onSelect,
		label
	}: {
		pool: Pool;
		view: CaseView;
		selected: string | null;
		onSelect: (playerId: string) => void;
		label: string;
	} = $props();

	const uid = $props.id();
	const POS: Record<Role, [number, number]> = {
		CF: [500, 108],
		LF: [215, 160],
		RF: [785, 160],
		SS: [375, 292],
		'2B': [625, 292],
		'3B': [255, 418],
		'1B': [725, 418],
		C: [500, 520],
		DH: [892, 500]
	};
	const GRADE_COLOR: Record<Grade, string> = {
		snug: 'var(--grade-snug-on-foam)',
		fits: 'var(--grade-fits-on-foam)',
		loose: 'var(--grade-loose-on-foam)',
		unknown: 'var(--unknown-on-foam)'
	};

	const sockets = $derived(
		(Object.entries(POS) as [Role, [number, number]][]).map(([role, [x, y]]) => {
			const id = view.lineup[role] ?? null;
			const player = id ? pool.get(id) : undefined;
			return { role, x, y, player, r: player ? caseRadius(player) : 0 };
		})
	);
	const tray = $derived.by(() => {
		const bench = view.bench.map((id, i, all) => {
			const player = pool.get(id)!;
			const cx = 40 + (920 / Math.max(all.length, 6)) * (i + 0.5);
			return { player, cx, cy: 752, r: caseRadius(player) };
		});
		const gaps = view.gaps.map((role, i, all) => ({
			role,
			cx: 190 + (770 / Math.max(all.length, 5)) * (i + 0.5),
			cy: 905
		}));
		return { bench, gaps };
	});

	function runsText(p: CasePlayer): string {
		return p.runs == null ? 'runs n/a' : `${p.runs.toFixed(1)} R`;
	}
	function keySelect(event: KeyboardEvent, id: string): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onSelect(id);
		}
	}
</script>

<svg class="case" viewBox="0 0 1000 980" role="group" aria-label={label}>
	<defs>
		<pattern
			id="{uid}-hatch"
			width="7"
			height="7"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(45)"
		>
			<rect width="7" height="7" fill="var(--foam-deep)" />
			<line x1="0" y1="0" x2="0" y2="7" stroke="var(--foam-edge)" stroke-width="2" />
		</pattern>
		<pattern id="{uid}-foam" width="6" height="6" patternUnits="userSpaceOnUse">
			<rect width="6" height="6" fill="var(--foam)" />
			<circle cx="1.5" cy="1.5" r="0.7" fill="var(--foam-edge)" fill-opacity="0.18" />
			<circle cx="4.5" cy="4.2" r="0.6" fill="var(--foam-deep)" />
		</pattern>
	</defs>

	<rect x="430" y="2" width="140" height="22" rx="8" fill="var(--foam-deep)" />
	<rect x="6" y="16" width="988" height="958" rx="26" fill="var(--foam)" />
	<rect x="160" y="10" width="40" height="16" rx="3" fill="var(--foam-edge)" fill-opacity="0.45" />
	<rect x="800" y="10" width="40" height="16" rx="3" fill="var(--foam-edge)" fill-opacity="0.45" />
	<rect x="20" y="30" width="960" height="616" rx="16" fill="url(#{uid}-foam)" />
	<rect x="20" y="662" width="960" height="300" rx="16" fill="url(#{uid}-foam)" />
	<text class="stencil" x="40" y="70" font-size="18">BOS 26 · POSITION PLAYERS</text>
	<text class="stencil" x="40" y="700" font-size="16">Bench tray</text>
	<text class="note" x="960" y="700" text-anchor="end">sized by actual 2026 runs, translucent</text>

	<polygon
		points="500,470 690,340 500,215 310,340"
		fill="none"
		stroke="var(--foam-edge)"
		stroke-opacity="0.5"
		stroke-width="2"
		stroke-dasharray="2 6"
	/>
	<line
		x1="818"
		y1="330"
		x2="818"
		y2="640"
		stroke="var(--foam-edge)"
		stroke-opacity="0.5"
		stroke-width="1.5"
		stroke-dasharray="2 6"
	/>
	<text class="note" x="892" y="400" text-anchor="middle">No glove</text>

	{#each sockets as s (s.role)}
		{@const ask = CUTOUT_ASK[s.role]}
		{@const star = ask.primary === 'Star'}
		<path
			d={shapePath(ask.primary, s.x, s.y, 52)}
			fill="var(--foam-deep)"
			stroke="var(--foam-edge)"
			stroke-width="1.5"
		/>
		<text class="sock-label" x={s.x} y={s.y - (star ? 80 : 62)} text-anchor="middle">{s.role}</text>
		{#if s.player}
			{@const p = s.player}
			{@const g = grade(p, s.role)}
			<g
				class="piece"
				class:sel={selected === p.id}
				role="button"
				tabindex="0"
				aria-label="{s.role}: {p.name}, {p.shape}, {GRADE_TEXT[g].toLowerCase()} fit, {p.runs ==
				null
					? 'runs unavailable'
					: `${p.runs.toFixed(1)} runs`}"
				aria-pressed={selected === p.id}
				onclick={() => onSelect(p.id)}
				onkeydown={(e) => keySelect(e, p.id)}
			>
				<Piece player={p} cx={s.x} cy={s.y} r={s.r} hatch="{uid}-hatch" />
				<text class="bats" x={s.x} y={s.y + 5} text-anchor="middle">{p.bats}</text>
				{#if view.movedIn.includes(p.id)}
					<path
						d={shapePath(p.shape === 'Unclassified' ? 'Circle' : p.shape, s.x, s.y, s.r + 7)}
						fill="none"
						stroke="var(--on-foam)"
						stroke-width="2"
						stroke-dasharray="6 4"
					/>
				{/if}
			</g>
		{/if}
	{/each}

	<!-- Captions are drawn after every cutout and piece so a neighbouring piece
	     can never cover them; x is clamped to keep them inside the case. -->
	{#each sockets as s (s.role)}
		{@const star = CUTOUT_ASK[s.role].primary === 'Star'}
		{@const cx = Math.min(Math.max(s.x, 100), 880)}
		{#if s.player}
			{@const p = s.player}
			{@const g = grade(p, s.role)}
			<text class="sock-name" x={cx} y={s.y + (star ? 82 : 72)} text-anchor="middle">{p.last}</text>
			<text
				class="sock-fit"
				x={cx}
				y={s.y + (star ? 99 : 89)}
				text-anchor="middle"
				fill={GRADE_COLOR[g]}
				>{GRADE_TEXT[g].toUpperCase()} · {runsText(p)} · {Math.round(p.pa.L + p.pa.R)} PA</text
			>
		{:else}
			<text class="sock-name" x={cx} y={s.y + 72} text-anchor="middle">empty</text>
		{/if}
	{/each}

	{#each tray.bench as b (b.player.id)}
		{@const p = b.player}
		<path
			d={shapePath(p.shape === 'Unclassified' ? 'Circle' : p.shape, b.cx, b.cy, b.r + 6)}
			fill="var(--foam-deep)"
			stroke="var(--foam-edge)"
		/>
		<g
			class="piece"
			class:sel={selected === p.id}
			role="button"
			tabindex="0"
			aria-label="Bench: {p.name}, {p.shape}, {p.runs == null
				? 'runs unavailable'
				: `${p.runs.toFixed(1)} runs`}"
			aria-pressed={selected === p.id}
			onclick={() => onSelect(p.id)}
			onkeydown={(e) => keySelect(e, p.id)}
		>
			<Piece player={p} cx={b.cx} cy={b.cy} r={b.r} faded hatch="{uid}-hatch" />
			{#if view.movedOut.includes(p.id)}
				<path
					d={shapePath(p.shape === 'Unclassified' ? 'Circle' : p.shape, b.cx, b.cy, b.r + 6)}
					fill="none"
					stroke="var(--on-foam)"
					stroke-width="2"
					stroke-dasharray="6 4"
				/>
			{/if}
		</g>
		<text class="tray-name" x={b.cx} y={b.cy + 64} text-anchor="middle">{p.last}</text>
		<text class="note" x={b.cx} y={b.cy + 78} text-anchor="middle"
			>{p.elig.length ? p.elig.join('/') : 'no position'}</text
		>
		<text class="note" x={b.cx} y={b.cy + 91} text-anchor="middle"
			>{p.runs == null
				? 'no 2026 PA'
				: `${p.runs.toFixed(1)} R · ${Math.round(p.pa.L + p.pa.R)} PA`}</text
		>
	{/each}

	<text class="stencil" x="40" y="866" font-size="13"
		>{tray.gaps.length ? 'EMPTY CUTOUTS' : 'NO EMPTY CUTOUTS'}</text
	>
	{#each tray.gaps as gap (gap.role)}
		<path
			d={shapePath(CUTOUT_ASK[gap.role].primary, gap.cx, gap.cy, 22)}
			fill="none"
			stroke="var(--unknown-on-foam)"
			stroke-width="1.5"
			stroke-dasharray="4 5"
		/>
		<text class="note" x={gap.cx} y={gap.cy + 5} text-anchor="middle" font-size="14">?</text>
		<text class="tray-name" x={gap.cx} y={gap.cy + 42} text-anchor="middle"
			>No {gap.role} cover</text
		>
	{/each}
</svg>

<style>
	.case {
		display: block;
		width: 100%;
		height: auto;
	}
	.stencil {
		fill: var(--on-foam);
		fill-opacity: 0.78;
		font-family: var(--font-sans);
		letter-spacing: 0.02em;
	}
	.note {
		fill: var(--on-foam);
		fill-opacity: 0.78;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		letter-spacing: 0.04em;
	}
	.sock-label {
		fill: var(--on-foam);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		letter-spacing: 0.02em;
	}
	.sock-name,
	.sock-fit {
		paint-order: stroke;
		stroke: var(--foam);
		stroke-width: 4px;
		stroke-linejoin: round;
		pointer-events: none;
	}
	.sock-name {
		fill: var(--on-foam);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 600;
	}
	.sock-fit {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		letter-spacing: 0.02em;
	}
	.tray-name {
		fill: var(--on-foam);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.bats {
		fill: var(--foam-deep);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		paint-order: stroke;
		stroke: var(--on-foam);
		stroke-opacity: 0.85;
		stroke-width: 3px;
		pointer-events: none;
	}
	.piece {
		cursor: pointer;
		outline: none;
	}
	.piece:focus-visible :global(.body),
	.piece.sel :global(.body) {
		stroke: var(--on-foam);
		stroke-width: 3;
		stroke-dasharray: none;
	}
	.piece:focus-visible :global(.body) {
		stroke: var(--on-foam);
	}
</style>
