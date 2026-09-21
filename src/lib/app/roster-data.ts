export interface LineupEntry {
	order: number;
	player: string;
	position: string;
}

export interface LineupColumn {
	label: string;
	date: string;
	entries: readonly LineupEntry[];
	source: string;
}

export interface DepthChartEntry {
	position: string;
	starter: string;
	rightHanded: string;
	leftHanded: string;
	benchOne: string;
	benchTwo: string;
}

// Source-backed snapshots for the landing page. These are intentionally
// separate from the scenario bundles: a dated lineup is evidence, not an
// inferred allocation or a replacement for the deterministic engine.
export const ACTUAL_LINEUP_SNAPSHOTS = [
	{
		label: 'Observed vs RHP',
		date: 'September 20, 2026',
		source: 'MLB Stats API · game 822922 · Red Sox at Rays',
		entries: [
			{ order: 1, player: 'Roman Anthony', position: 'LF' },
			{ order: 2, player: 'Mickey Gasper', position: 'DH' },
			{ order: 3, player: 'Adley Rutschman', position: 'C' },
			{ order: 4, player: 'Trevor Story', position: 'SS' },
			{ order: 5, player: 'Nick Sogard', position: '1B' },
			{ order: 6, player: 'Caleb Durbin', position: '3B' },
			{ order: 7, player: 'Jarren Duran', position: 'CF' },
			{ order: 8, player: 'Isiah Kiner-Falefa', position: '2B' },
			{ order: 9, player: 'Nate Eaton', position: 'RF' }
		] satisfies readonly LineupEntry[]
	},
	{
		label: 'Vs LHP',
		date: 'Not published',
		source: 'No source-backed platoon lineup was published; do not infer one from overall rates.',
		entries: [] satisfies readonly LineupEntry[]
	}
] as const satisfies readonly LineupColumn[];

export const DEPTH_CHART_SNAPSHOT = {
	date: 'September 21, 2026',
	source: 'MLB.com · Red Sox depth chart',
	url: 'https://www.mlb.com/redsox/roster/depth-chart',
	entries: [
		{
			position: 'C',
			starter: 'Adley Rutschman',
			rightHanded: 'Connor Wong',
			leftHanded: 'Not published',
			benchOne: 'Mickey Gasper',
			benchTwo: '—'
		},
		{
			position: '1B',
			starter: 'Mickey Gasper',
			rightHanded: 'Willson Contreras',
			leftHanded: 'Not published',
			benchOne: 'Nick Sogard',
			benchTwo: '—'
		},
		{
			position: '2B',
			starter: 'Nick Sogard',
			rightHanded: 'Isiah Kiner-Falefa',
			leftHanded: 'Not published',
			benchOne: 'Andruw Monasterio',
			benchTwo: '—'
		},
		{
			position: '3B',
			starter: 'Caleb Durbin',
			rightHanded: 'Nick Sogard',
			leftHanded: 'Not published',
			benchOne: 'Isiah Kiner-Falefa',
			benchTwo: '—'
		},
		{
			position: 'SS',
			starter: 'Andruw Monasterio',
			rightHanded: 'Trevor Story',
			leftHanded: 'Not published',
			benchOne: 'Isiah Kiner-Falefa',
			benchTwo: '—'
		},
		{
			position: 'LF',
			starter: 'Jarren Duran',
			rightHanded: 'Roman Anthony',
			leftHanded: 'Not published',
			benchOne: 'Jahmai Jones',
			benchTwo: '—'
		},
		{
			position: 'CF',
			starter: 'Ceddanne Rafaela',
			rightHanded: 'Eli White',
			leftHanded: 'Not published',
			benchOne: 'Jarren Duran',
			benchTwo: '—'
		},
		{
			position: 'RF',
			starter: 'Wilyer Abreu',
			rightHanded: 'Eli White',
			leftHanded: 'Not published',
			benchOne: 'Roman Anthony',
			benchTwo: '—'
		},
		{
			position: 'DH',
			starter: 'Roman Anthony',
			rightHanded: 'Masataka Yoshida',
			leftHanded: 'Not published',
			benchOne: 'Jahmai Jones',
			benchTwo: '—'
		}
	] satisfies readonly DepthChartEntry[]
} as const;

export function headshotUrl(playerId: string): string {
	const mlbamId = playerId.replace('mlbam-', '');
	return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:silo:current.png/r_max/w_180,q_auto:best/v1/people/${mlbamId}/headshot/silo/current`;
}
