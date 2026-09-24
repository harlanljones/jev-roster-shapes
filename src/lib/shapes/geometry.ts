// Equal-area shape geometry for the Shape Case diagrams (D-43).
// Every label draws with the same area for the same radius r (π r²), so a
// piece's size carries the quantity it is sized by, never its shape. Pure
// display geometry: nothing here enters a bundle, digest, or calculation.
import type { ShapeLabel } from './taxonomy';

export type Point = readonly [number, number];

function ngon(n: number, radius: number, rotation: number): Point[] {
	return Array.from({ length: n }, (_, i) => {
		const a = rotation + (i * 2 * Math.PI) / n;
		return [radius * Math.cos(a), radius * Math.sin(a)] as const;
	});
}

export function polygonArea(points: readonly Point[]): number {
	let sum = 0;
	for (let i = 0; i < points.length; i++) {
		const [x1, y1] = points[i]!;
		const [x2, y2] = points[(i + 1) % points.length]!;
		sum += x1 * y2 - x2 * y1;
	}
	return Math.abs(sum) / 2;
}

// An irregular, lopsided outline for Funky (position-less or fringe) pieces.
const BLOB: readonly Point[] = Array.from({ length: 72 }, (_, i) => {
	const t = (i / 72) * 2 * Math.PI;
	const r = 1 + 0.2 * Math.sin(3 * t + 0.6) + 0.1 * Math.cos(5 * t) + 0.06 * Math.sin(2 * t);
	return [r * Math.cos(t), r * Math.sin(t) * 0.92] as const;
});
const BLOB_AREA = polygonArea(BLOB);

/** Outline points centered on the origin, or null for a circle. */
export function shapePoints(shape: ShapeLabel, r: number): Point[] | null {
	const area = Math.PI * r * r;
	switch (shape) {
		case 'Square': {
			const h = Math.sqrt(area) / 2;
			return [
				[-h, -h],
				[h, -h],
				[h, h],
				[-h, h]
			];
		}
		case 'Rectangle': {
			const hh = Math.sqrt(area / 1.8) / 2;
			const hw = hh * 1.8;
			return [
				[-hw, -hh],
				[hw, -hh],
				[hw, hh],
				[-hw, hh]
			];
		}
		case 'Diamond': {
			const d = Math.sqrt(area) / Math.SQRT2;
			return [
				[0, -d],
				[d, 0],
				[0, d],
				[-d, 0]
			];
		}
		case 'Pentagon':
			return ngon(5, Math.sqrt((2 * area) / (5 * Math.sin((2 * Math.PI) / 5))), -Math.PI / 2);
		case 'Octagon':
			return ngon(8, Math.sqrt((2 * area) / (8 * Math.sin((2 * Math.PI) / 8))), Math.PI / 8);
		case 'Star': {
			const outer = Math.sqrt(area / (5 * 0.5 * Math.sin(Math.PI / 5)));
			return Array.from({ length: 10 }, (_, i) => {
				const a = -Math.PI / 2 + (i * Math.PI) / 5;
				const rr = i % 2 ? outer * 0.5 : outer;
				return [rr * Math.cos(a), rr * Math.sin(a)] as const;
			});
		}
		case 'Funky': {
			const k = Math.sqrt(area / BLOB_AREA);
			return BLOB.map(([x, y]) => [x * k, y * k] as const);
		}
		default:
			return null;
	}
}

const f = (n: number) => n.toFixed(1);

/** SVG path data for a shape centered at (cx, cy). Funky is smoothed. */
export function shapePath(shape: ShapeLabel, cx: number, cy: number, r: number): string {
	const pts = shapePoints(shape, r);
	if (!pts) {
		return `M${f(cx - r)},${f(cy)} a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0 a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0 Z`;
	}
	const q = pts.map(([x, y]) => [x + cx, y + cy] as const);
	if (shape !== 'Funky') return `M${q.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} Z`;
	let d = `M${f(q[0]![0])},${f(q[0]![1])}`;
	for (let i = 0; i < q.length; i++) {
		const p0 = q[(i - 1 + q.length) % q.length]!;
		const p1 = q[i]!;
		const p2 = q[(i + 1) % q.length]!;
		const p3 = q[(i + 2) % q.length]!;
		d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
	}
	return `${d} Z`;
}

export interface Extents {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

/** Where the outline crosses the two axes through its center. */
export function axisExtents(shape: ShapeLabel, r: number): Extents {
	const pts = shapePoints(shape, r);
	if (!pts) return { top: -r, bottom: r, left: -r, right: r };
	const ys: number[] = [];
	const xs: number[] = [];
	for (let i = 0; i < pts.length; i++) {
		const [x1, y1] = pts[i]!;
		const [x2, y2] = pts[(i + 1) % pts.length]!;
		if ((x1 <= 0 && x2 > 0) || (x2 <= 0 && x1 > 0))
			ys.push(y1 + ((0 - x1) * (y2 - y1)) / (x2 - x1));
		if ((y1 <= 0 && y2 > 0) || (y2 <= 0 && y1 > 0))
			xs.push(x1 + ((0 - y1) * (x2 - x1)) / (y2 - y1));
	}
	return {
		top: Math.min(...ys),
		bottom: Math.max(...ys),
		left: Math.min(...xs),
		right: Math.max(...xs)
	};
}

/** Axis-aligned bounding box of the outline. */
export function boundingBox(shape: ShapeLabel, r: number): Extents {
	const pts = shapePoints(shape, r);
	if (!pts) return { left: -r, right: r, top: -r, bottom: r };
	return {
		left: Math.min(...pts.map((p) => p[0])),
		right: Math.max(...pts.map((p) => p[0])),
		top: Math.min(...pts.map((p) => p[1])),
		bottom: Math.max(...pts.map((p) => p[1]))
	};
}

/** Vertical span [top, bottom] of the outline at horizontal offset lx, or null outside it. */
export function columnSpan(shape: ShapeLabel, r: number, lx: number): [number, number] | null {
	const pts = shapePoints(shape, r);
	if (!pts) {
		if (Math.abs(lx) >= r) return null;
		const h = Math.sqrt(r * r - lx * lx);
		return [-h, h];
	}
	let lo = Infinity;
	let hi = -Infinity;
	for (let i = 0; i < pts.length; i++) {
		const [x1, y1] = pts[i]!;
		const [x2, y2] = pts[(i + 1) % pts.length]!;
		if ((x1 <= lx && x2 > lx) || (x2 <= lx && x1 > lx)) {
			const y = y1 + ((lx - x1) / (x2 - x1)) * (y2 - y1);
			lo = Math.min(lo, y);
			hi = Math.max(hi, y);
		}
	}
	return lo === Infinity ? null : [lo, hi];
}
