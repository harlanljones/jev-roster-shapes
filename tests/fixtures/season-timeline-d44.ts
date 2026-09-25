// Frozen engine fixtures (D-48): four D-44 season-timeline storylines, kept
// byte-for-byte from main at 433116a after D-48 replaced them in the app, so
// the D-45 pool-fit hand derivations keep their inputs. Public observed data,
// not team-approved projections; not shipped in the app.
import deadlineCatcher from './deadline-catcher-2026.json';
import octoberLineup from './october-lineup-2026.json';
import preseasonDh from './preseason-dh-2026.json';
import preseasonSecond from './preseason-second-2026.json';
import { parseBundle, type Bundle } from '../../src/lib/contracts';

const frozen: Record<string, unknown> = {
	'deadline-catcher': deadlineCatcher,
	'october-lineup': octoberLineup,
	'preseason-dh': preseasonDh,
	'preseason-second': preseasonSecond
};

export function d44Bundle(slug: string): Bundle {
	const json = frozen[slug];
	if (!json) throw new Error(`no frozen D-44 bundle ${slug}`);
	return parseBundle(json);
}
