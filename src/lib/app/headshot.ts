// MLB headshot URL for a player id (display only; the image is loaded from
// MLB's CDN when a player page opens and nothing depends on it).
export function headshotUrl(playerId: string): string {
	const mlbamId = playerId.replace('mlbam-', '');
	return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:silo:current.png/r_max/w_180,q_auto:best/v1/people/${mlbamId}/headshot/silo/current`;
}
