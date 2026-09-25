<script lang="ts">
	import { caseRadius, type Edge, type Pool, type Role } from '../shape-case';
	import Piece from './Piece.svelte';

	// The same pieces off the field (D-43): who shares a position, which swaps
	// the storylines test, which pairs platoon on real splits, and who uses the
	// DH lane. Positions are fixed so the map reads the same across storylines.
	let {
		pool,
		edges,
		roleOf,
		lineupIds,
		dh,
		activeTest,
		selected,
		onSelect
	}: {
		pool: Pool;
		edges: readonly Edge[];
		roleOf: ReadonlyMap<string, Role>;
		lineupIds: readonly string[];
		dh: string | null;
		activeTest: { story: string; scenarioId: string } | null;
		selected: string | null;
		onSelect: (playerId: string) => void;
	} = $props();

	const uid = $props.id();
	const NET_POS: Record<string, [number, number]> = {
		'mlbam-575929': [100, 118],
		'mlbam-686765': [300, 105],
		'mlbam-655316': [170, 300],
		'mlbam-643396': [385, 250],
		'mlbam-596115': [310, 430],
		'mlbam-702332': [95, 470],
		'mlbam-701350': [640, 110],
		'mlbam-680776': [790, 300],
		'mlbam-678882': [900, 150],
		'mlbam-677800': [905, 420],
		'mlbam-668939': [150, 615],
		'mlbam-657136': [370, 625],
		'mlbam-807799': [600, 580],
		'mlbam-681987': [770, 625],
		'mlbam-671213': [925, 590],
		// Season-timeline additions (D-44).
		'mlbam-691785': [235, 205],
		'mlbam-678011': [445, 520],
		'mlbam-665966': [262, 545],
		'mlbam-668670': [52, 615],
		'mlbam-663330': [660, 262],
		'mlbam-681508': [720, 478]
	};
	// Hand-tuned curvature so parallel edges and labels don't stack.
	const BEND: Record<string, number> = {
		'mlbam-657136|mlbam-701350': -0.22,
		'mlbam-681987|mlbam-701350': 0.04,
		'mlbam-701350|mlbam-807799': -0.08,
		'mlbam-643396|mlbam-686765': 0.22,
		'mlbam-655316|mlbam-686765': -0.2,
		'mlbam-596115|mlbam-655316': 0.2
	};
	const HUB: [number, number] = [535, 400];
	const CLUSTERS: [string, number, number][] = [
		['INFIELD', 200, 34],
		['OUTFIELD', 700, 34],
		['CATCHERS', 40, 560],
		['NO GLOVE', 580, 500]
	];
	const LAYERS = [
		{ key: 'platoon', label: 'Platoon fit (splits)', color: 'var(--snug)', style: 'dotted' },
		{ key: 'compete', label: 'Shared position', color: 'var(--ink-soft)', style: 'solid' },
		{ key: 'swap', label: 'Tested swap', color: 'var(--accent)', style: 'solid' },
		{ key: 'dh', label: 'DH lane', color: 'var(--marker)', style: 'dashed' }
	] as const;
	let layers = $state<Record<Edge['type'], boolean>>({
		compete: true,
		swap: true,
		dh: true,
		platoon: true
	});

	// Players the fixed layout doesn't know (an imported pool) take free spots.
	const positions = $derived.by(() => {
		const out: Record<string, [number, number]> = {};
		let spare = 0;
		for (const id of pool.keys()) {
			const known = NET_POS[id];
			if (known) out[id] = known;
			else {
				out[id] = [80 + (spare % 8) * 120, 680 - Math.floor(spare / 8) * 70];
				spare++;
			}
		}
		return out;
	});
	const pos = (id: string): [number, number] => (id === 'HUB' ? HUB : (positions[id] ?? HUB));
	const rad = (id: string) => (id === 'HUB' ? 46 : Math.max(caseRadius(pool.get(id)!), 22) + 4);

	const shown = $derived(edges.filter((e) => layers[e.type] && pool.has(e.a)));
	const touches = (e: Edge) => e.a === selected || e.b === selected;
	const anyHit = $derived(!!selected && shown.some(touches));
	const drawn = $derived(
		shown.map((e) => {
			const [x1, y1] = pos(e.a);
			const [x2, y2] = pos(e.b);
			const dx = x2 - x1;
			const dy = y2 - y1;
			const key = [e.a, e.b].sort().join('|');
			const bend =
				(BEND[key] ?? (e.type === 'swap' ? 0.14 : e.type === 'platoon' ? -0.16 : 0)) *
				(e.a < e.b ? 1 : -1);
			const mx = (x1 + x2) / 2 - dy * bend;
			const my = (y1 + y2) / 2 + dx * bend;
			const a1 = Math.atan2(my - y1, mx - x1);
			const a2 = Math.atan2(my - y2, mx - x2);
			const sx = x1 + Math.cos(a1) * rad(e.a);
			const sy = y1 + Math.sin(a1) * rad(e.a);
			const ex = x2 + Math.cos(a2) * rad(e.b);
			const ey = y2 + Math.sin(a2) * rad(e.b);
			const now =
				e.type === 'swap' &&
				!!activeTest &&
				e.tests.some((t) => t.story === activeTest.story && t.scenarioId === activeTest.scenarioId);
			return {
				key: `${e.type}:${key}`,
				e,
				d: `M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`,
				lx: 0.25 * sx + 0.5 * mx + 0.25 * ex,
				ly: 0.25 * sy + 0.5 * my + 0.25 * ey + 4,
				now,
				dim: anyHit && !touches(e)
			};
		})
	);
	const lineupSet = $derived(new Set(lineupIds));

	function keySelect(event: KeyboardEvent, id: string): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onSelect(id);
		}
	}
</script>

<div class="layers" role="group" aria-label="Map layers">
	{#each LAYERS as layer (layer.key)}
		<button
			type="button"
			aria-pressed={layers[layer.key]}
			onclick={() => (layers[layer.key] = !layers[layer.key])}
		>
			<span class="swatch" style:border-top-color={layer.color} style:border-top-style={layer.style}
			></span>{layer.label}
		</button>
	{/each}
</div>

<svg
	class="map"
	viewBox="0 0 1000 700"
	role="group"
	aria-label="Interaction map of the player pool"
>
	<defs>
		<marker
			id="{uid}-arrow"
			viewBox="0 0 10 10"
			refX="9"
			refY="5"
			markerWidth="7"
			markerHeight="7"
			orient="auto-start-reverse"
		>
			<path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
		</marker>
		<pattern
			id="{uid}-hatch"
			width="7"
			height="7"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(45)"
		>
			<rect width="7" height="7" fill="#d9ddd8" />
			<line x1="0" y1="0" x2="0" y2="7" stroke="#8a938d" stroke-width="2" />
		</pattern>
	</defs>
	{#each CLUSTERS as [name, x, y] (name)}
		<text class="cluster" {x} {y}>{name}</text>
	{/each}
	<circle class="hub-ring" cx={HUB[0]} cy={HUB[1]} r="44" />
	<text class="hub-text" x={HUB[0]} y={HUB[1] + 8} text-anchor="middle">DH</text>
	<text class="sub" x={HUB[0]} y={HUB[1] + 64} text-anchor="middle"
		>now: {dh ? (pool.get(dh)?.last ?? 'unknown') : 'empty'}</text
	>

	{#each drawn as edge (edge.key)}
		<path
			class="e e-{edge.e.type}"
			class:now={edge.now}
			class:dim={edge.dim}
			d={edge.d}
			marker-end={edge.e.type === 'swap' ? `url(#${uid}-arrow)` : undefined}
			>{#if edge.e.type === 'swap'}<title>{edge.e.title}</title>{/if}</path
		>
	{/each}

	{#each [...pool.values()] as p (p.id)}
		{@const [x, y] = pos(p.id)}
		{@const r = caseRadius(p)}
		{@const role = roleOf.get(p.id)}
		{@const hit =
			!anyHit ||
			p.id === selected ||
			shown.some((e) => touches(e) && (e.a === p.id || e.b === p.id))}
		<g
			class="piece"
			class:dim={!hit}
			class:sel={selected === p.id}
			role="button"
			tabindex="0"
			aria-label="{p.name} in the interaction map, {role ?? 'bench'}"
			aria-pressed={selected === p.id}
			onclick={() => onSelect(p.id)}
			onkeydown={(e) => keySelect(e, p.id)}
		>
			<Piece player={p} cx={x} cy={y} {r} faded={!lineupSet.has(p.id)} hatch="{uid}-hatch" />
			<text class="name" {x} y={y + r + (p.shape === 'Star' ? 22 : 17)} text-anchor="middle"
				>{p.last}</text
			>
			<text class="sub" {x} y={y + r + (p.shape === 'Star' ? 36 : 31)} text-anchor="middle"
				>{role ?? 'bench'} · {p.runs == null ? 'no data' : `${p.runs.toFixed(1)} R`}</text
			>
		</g>
	{/each}

	{#each drawn as edge (edge.key)}
		{#if edge.e.type !== 'dh'}
			<text
				class="e-lab {edge.e.type}"
				class:dim={edge.dim}
				x={edge.lx}
				y={edge.ly}
				text-anchor="middle">{edge.e.label}</text
			>
		{/if}
	{/each}
</svg>

<style>
	.layers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.layers button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.75rem;
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 0.5rem 0.9rem;
		color: var(--ink-soft);
		background: var(--panel);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.layers button[aria-pressed='true'] {
		border-color: var(--ink);
		color: var(--ink);
	}
	.layers button[aria-pressed='false'] .swatch {
		opacity: 0.35;
	}
	.swatch {
		width: 1.4rem;
		border-top-width: 3px;
	}
	.map {
		display: block;
		width: 100%;
		height: auto;
	}
	.cluster {
		fill: var(--ink-soft);
		font-family: var(--mono);
		font-size: 11px;
		letter-spacing: 0.08em;
	}
	.hub-ring {
		fill: none;
		stroke: var(--marker);
		stroke-width: 2;
		stroke-dasharray: 3 5;
	}
	.hub-text {
		fill: var(--marker);
		font-family: var(--display);
		font-size: 22px;
	}
	.e {
		fill: none;
	}
	.e-compete {
		stroke: var(--ink-soft);
		stroke-width: 1.6;
		opacity: 0.75;
	}
	.e-swap {
		stroke: var(--accent);
		stroke-width: 2;
	}
	.e-swap.now {
		stroke-width: 4.5;
	}
	.e-platoon {
		stroke: var(--snug);
		stroke-width: 3;
		stroke-dasharray: 2 5;
		stroke-linecap: round;
	}
	.e-dh {
		stroke: var(--marker);
		stroke-width: 1.6;
		stroke-dasharray: 5 5;
	}
	.e.dim {
		opacity: 0.12;
	}
	.e-lab {
		font-family: var(--mono);
		font-size: 11.5px;
		paint-order: stroke;
		stroke: var(--panel);
		stroke-width: 4px;
		stroke-linejoin: round;
		pointer-events: none;
	}
	.e-lab.compete {
		fill: var(--ink-soft);
	}
	.e-lab.swap {
		fill: var(--accent);
	}
	.e-lab.platoon {
		fill: var(--snug);
	}
	.e-lab.dim {
		opacity: 0.15;
	}
	.name {
		fill: var(--ink);
		font-family: var(--body);
		font-size: 13.5px;
		font-weight: 600;
		paint-order: stroke;
		stroke: var(--panel);
		stroke-width: 4px;
	}
	.sub {
		fill: var(--ink-soft);
		font-family: var(--mono);
		font-size: 11px;
		paint-order: stroke;
		stroke: var(--panel);
		stroke-width: 4px;
	}
	.piece {
		cursor: pointer;
		outline: none;
	}
	.piece.dim {
		opacity: 0.25;
	}
	.piece.sel :global(.body) {
		stroke: var(--ink);
		stroke-width: 3;
		stroke-dasharray: none;
	}
	.piece:focus-visible :global(.body) {
		stroke: var(--marker);
		stroke-width: 3.5;
		stroke-dasharray: none;
	}
</style>
