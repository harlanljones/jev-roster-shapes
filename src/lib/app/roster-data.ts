export interface LineupEntry {
	order: number;
	player: string;
	position: string;
}

export interface DepthChartEntry {
	position: string;
	players: readonly string[];
}

// Source-backed snapshots for the landing page. These are intentionally
// separate from the scenario bundles: a dated lineup is evidence, not an
// inferred allocation or a replacement for the deterministic engine.
export const ACTUAL_LINEUP_SNAPSHOT = {
	date: 'September 20, 2026',
	source: 'MLB Stats API · game 822922 · Red Sox at Rays',
	url: 'https://statsapi.mlb.com/api/v1/game/822922/boxscore',
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
} as const;

export const DEPTH_CHART_SNAPSHOT = {
	date: 'September 21, 2026',
	source: 'MLB.com · Red Sox depth chart',
	url: 'https://www.mlb.com/redsox/roster/depth-chart',
	entries: [
		{ position: 'C', players: ['Adley Rutschman', 'Connor Wong', 'Mickey Gasper'] },
		{ position: '1B', players: ['Mickey Gasper', 'Willson Contreras', 'Nick Sogard'] },
		{ position: '2B', players: ['Nick Sogard', 'Isiah Kiner-Falefa', 'Andruw Monasterio'] },
		{ position: '3B', players: ['Caleb Durbin', 'Nick Sogard', 'Isiah Kiner-Falefa'] },
		{ position: 'SS', players: ['Andruw Monasterio', 'Trevor Story', 'Isiah Kiner-Falefa'] },
		{ position: 'LF', players: ['Jarren Duran', 'Roman Anthony', 'Jahmai Jones'] },
		{ position: 'CF', players: ['Ceddanne Rafaela', 'Eli White', 'Jarren Duran'] },
		{ position: 'RF', players: ['Wilyer Abreu', 'Eli White', 'Roman Anthony'] },
		{ position: 'DH', players: ['Roman Anthony', 'Masataka Yoshida', 'Jahmai Jones'] }
	] satisfies readonly DepthChartEntry[]
} as const;
