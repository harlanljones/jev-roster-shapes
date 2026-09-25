// Rewrites the pinned input digests and engine expectations in
// src/lib/storylines/registry.ts from the checked-in bundles, for the daily
// refresh PR. A reviewer still reconciles every changed value before merging.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateComparison } from '../../src/lib/engine/calculation.ts';
import { computeInputDigest, parseBundle } from '../../src/lib/contracts/bundle.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const registryPath = join(root, 'src', 'lib', 'storylines', 'registry.ts');
let registry = readFileSync(registryPath, 'utf8');
const slugs = [...registry.matchAll(/^\t\tslug: '([a-z0-9-]+)',$/gm)].map((match) => match[1]);
if (slugs.length === 0) throw new Error('no storyline slugs found in registry.ts');

for (const slug of slugs) {
	const bundle = parseBundle(
		JSON.parse(readFileSync(join(root, 'src', 'lib', 'storylines', `${slug}.json`), 'utf8'))
	);
	const calculation = calculateComparison(bundle);
	const digest = computeInputDigest(bundle);
	// Prettier drops the quotes on a key that is a plain identifier.
	const digestPattern = new RegExp(`(\\n\\t'?${slug}'?: ')[0-9a-f]+`);
	if (!digestPattern.test(registry)) throw new Error(`pinned digest not found: ${slug}`);
	registry = registry.replace(digestPattern, `$1${digest}`);

	const blockStart = registry.indexOf(`\t\tslug: '${slug}',`);
	const nextBlock = registry.indexOf('\n\tstoryline({', blockStart + 1);
	const blockEnd = nextBlock === -1 ? registry.indexOf('\n];', blockStart) : nextBlock;
	if (blockStart < 0 || blockEnd < 0) throw new Error(`storyline block not found: ${slug}`);
	let block = registry.slice(blockStart, blockEnd);
	for (const result of calculation.results) {
		const runs = result.offense.runs === null ? 'null' : `'${result.offense.runs}'`;
		const deltaValue =
			result.scenarioId === 'base'
				? '0'
				: calculation.offenseDeltas.find((d) => d.scenarioId === result.scenarioId)?.runs;
		const delta = deltaValue === null || deltaValue === undefined ? 'null' : `'${deltaValue}'`;
		const pattern = new RegExp(
			`(scenarioId: '${result.scenarioId}',\\s*offenseRuns: )(null|'[^']*')(,\\s*offenseDelta: )(null|'[^']*')`
		);
		if (!pattern.test(block))
			throw new Error(`expectation not found: ${slug}/${result.scenarioId}`);
		block = block.replace(pattern, `$1${runs}$3${delta}`);
	}
	registry = `${registry.slice(0, blockStart)}${block}${registry.slice(blockEnd)}`;
}

writeFileSync(registryPath, registry);
console.log(`synced ${slugs.length} storylines: ${slugs.join(', ')}`);
