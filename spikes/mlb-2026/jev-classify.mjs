// Asks Jev for every checked-in decision's players that have no recorded answer
// yet and writes src/lib/classification/jev-results.json (D-58). Run by the
// "Classify with Jev" workflow when new snapshots reach main; it needs
// TYPESAFE_API_KEY and refuses to run without one. A request that already has a
// valid answer for the same digest, rubric, and prompt is never asked again.
import { readFileSync, writeFileSync } from 'node:fs';
import {
	DEFAULT_JEV_MODEL,
	JEV_PRICE_TABLE,
	buildProfileRequest,
	classifyProfile,
	createHttpJevProvider,
	mergeResults,
	serializeResults,
	requestDigest,
	requestsToAsk
} from '../../src/lib/classification/index.ts';
import { jevEvidenceFor } from '../../src/lib/app/classification-evidence.ts';
import { storylineRegistry } from '../../src/lib/storylines/registry.ts';

const RESULTS_PATH = new URL('../../src/lib/classification/jev-results.json', import.meta.url);

const apiKey = process.env.TYPESAFE_API_KEY?.trim();
if (!apiKey) {
	console.error('TYPESAFE_API_KEY is not set; refusing to run (nothing was sent).');
	process.exit(1);
}

const previous = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
const evidence = storylineRegistry.flatMap((story) => jevEvidenceFor(story));
const requestOf = (item) => buildProfileRequest(item, DEFAULT_JEV_MODEL);
const requests = evidence.map(requestOf);
const askDigests = new Set(requestsToAsk(requests, previous).map(requestDigest));
const toAsk = new Map();
for (const item of evidence) {
	const digest = requestDigest(requestOf(item));
	if (askDigests.has(digest)) toAsk.set(digest, item);
}
console.log(
	`${new Set(requests.map(requestDigest)).size} distinct requests, ${toAsk.size} need an answer`
);

const provider = createHttpJevProvider({ apiKey });
const fresh = [];
let failures = 0;
for (const item of toAsk.values()) {
	const record = await classifyProfile(item, { provider, acknowledged: true });
	if (record.status === 'current') {
		fresh.push(record);
	} else {
		failures += 1;
		console.error(
			`not recorded: ${item.name} (${record.status}) ${record.issues.map((i) => i.code).join(', ')}`
		);
	}
}

const next = mergeResults(requests, previous, fresh);
const text = serializeResults(next);
if (text !== readFileSync(RESULTS_PATH, 'utf8')) writeFileSync(RESULTS_PATH, text);

const tokens = fresh.reduce((sum, r) => sum + (r.usage?.inputTokens ?? 0), 0);
console.log(
	`recorded ${fresh.length}, failed ${failures}, kept ${Object.keys(next.records).length - fresh.length}; ` +
		`${tokens} input tokens (~$${((tokens * JEV_PRICE_TABLE.inputUsdPerMillionTokens) / 1e6).toFixed(6)} at list price)`
);
if (failures > 0) process.exit(1);
