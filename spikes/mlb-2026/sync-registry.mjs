import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateComparison } from '../../src/lib/engine/calculation.ts';
import { computeInputDigest, parseBundle } from '../../src/lib/contracts/bundle.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const registryPath = join(root, 'src', 'lib', 'storylines', 'registry.ts');
const slugs = ['power-vacuum', 'outfield-logjam', 'infield-reset', 'catcher-split', 'lefty-hole'];
let registry = readFileSync(registryPath, 'utf8');

for (const slug of slugs) {
	const bundle = parseBundle(
		JSON.parse(readFileSync(join(root, 'src', 'lib', 'storylines', `${slug}.json`), 'utf8'))
	);
	const calculation = calculateComparison(bundle);
	const digest = computeInputDigest(bundle);
	registry = registry.replace(new RegExp(`('${slug}': ')[0-9a-f]+`), `$1${digest}`);

	const blockStart = registry.indexOf(`'${slug}',`);
	const nextBlock = registry.indexOf('\n\tstoryline(', blockStart + 1);
	const blockEnd = nextBlock === -1 ? registry.indexOf('\n];', blockStart) : nextBlock;
	if (blockStart < 0 || blockEnd < 0) throw new Error(`storyline block not found: ${slug}`);
	let block = registry.slice(blockStart, blockEnd);
	for (const result of calculation.results) {
		const runs = result.offense.runs === null ? 'null' : `'${result.offense.runs}'`;
		const delta =
			result.scenarioId === 'base'
				? "'0'"
				: (() => {
						const value = calculation.offenseDeltas.find(
							(candidate) => candidate.scenarioId === result.scenarioId
						)?.runs;
						return value === null || value === undefined ? 'null' : `'${value}'`;
					})();
		const runPattern = new RegExp(
			`(scenarioId: '${result.scenarioId}', offenseRuns: )(null|'[^']*')`
		);
		block = block.replace(runPattern, `$1${runs}`);
		const deltaPattern = new RegExp(
			`(scenarioId: '${result.scenarioId}', offenseRuns: (?:null|'[^']*'), offenseDelta: )(null|'[^']*')`
		);
		block = block.replace(deltaPattern, `$1${delta}`);
	}
	registry = `${registry.slice(0, blockStart)}${block}${registry.slice(blockEnd)}`;
}

writeFileSync(registryPath, registry);
