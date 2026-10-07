// Probe: why does Jev's evidence_sufficient answer cluster near 0.5? (D-59)
//
// Recorded answers for players with complete evidence sit at 0.29-0.55 (mean
// 0.45), the one player with nothing sits at 0.10, and the same player moves by
// up to 0.19 between storylines. This script changes ONE thing at a time on a
// fixed sample and reports how far evidence_sufficient moves, against the run
// to run noise of the unchanged prompt. It calls the provider directly (no
// cache), writes nothing under src/, and its results are an experiment, not a
// classification: synthetic variants are labeled and never recorded.
//
//   TYPESAFE_API_KEY=… bun spikes/mlb-2026/jev-probe.mjs
//
// Output: reports/jev-probe/probe-<timestamp>.{json,md}, and the report on stdout.
//
// Pre-registered reading (fixed before any run):
//   noise      mean within-player sd across 3 unchanged repeats. A shift is
//              only called real if it also exceeds 2x this noise.
//   supported  mean shift >= +0.15 and > 2x noise
//   rejected   |mean shift| < 0.05
//   otherwise  inconclusive (a drop of 0.15+ is reported as 'moved down')
//   control    negStrip passes if it falls by 0.20+ and > 2x noise
//
// Hypotheses (variant ids):
//   H1 scope    the question covers the whole rubric, incl. Pentagon/Octagon
//               rules the sources can never evaluate        -> scoped, synthAge
//   H2 cues     the prompt itself says data is missing        -> noAge, noNote, noAgeNote
//   H3 scale    the noul scale is compressed toward 0.5       -> asChoice
//   H4 context  the profile question changes the answer       -> q2Only
//   controls    negStrip must fall well below base (the question is sensitive
//               to evidence); base repeats measure noise.
import { mkdirSync, writeFileSync } from 'node:fs';
import {
	DEFAULT_JEV_MODEL,
	buildProfileRequest,
	createHttpJevProvider
} from '../../src/lib/classification/index.ts';
import { jevEvidenceFor } from '../../src/lib/app/classification-evidence.ts';
import { getStoryline } from '../../src/lib/storylines/registry.ts';

const apiKey = process.env.TYPESAFE_API_KEY?.trim();
if (!apiKey) {
	console.error('TYPESAFE_API_KEY is not set; refusing to run (nothing was sent).');
	process.exit(1);
}

// Fixed sample: the Wild Card pool (complete evidence) plus Triston Casas from
// the offseason pool (no plate appearances, no splits: the natural low case).
const sample = [
	...jevEvidenceFor(getStoryline('wild-card-roster')),
	...jevEvidenceFor(getStoryline('offseason-infield')).filter((e) => e.name === 'Triston Casas')
];

const Q = 'evidence_sufficient';
const withoutLine = (state, prefix) =>
	state
		.split('\n')
		.filter((line) => !line.startsWith(prefix))
		.join('\n');
const reworded = (request, instructions) => ({
	...request,
	questions: { ...request.questions, [Q]: { ...request.questions[Q], instructions } }
});

const SCOPED =
	'Do the supplied observations contain enough evidence to choose among the profile labels that can be decided from them ' +
	'(Square, Rectangle, Circle, Diamond, Star, Funky, Unclassified), setting aside Pentagon and Octagon, ' +
	'which need age and defensive data that are not supplied?';

/** id → { note, repeats, build(evidence) → request, read(answer) → number|null } */
const readNoul = (answers) =>
	answers?.[Q]?.type === 'noul' && Number.isFinite(answers[Q].noul) ? answers[Q].noul : null;
const readChoiceTrue = (answers) =>
	answers?.[Q]?.type === 'choice' && Number.isFinite(answers[Q].probabilities?.true)
		? answers[Q].probabilities.true
		: null;

const baseRequest = (e) => buildProfileRequest(e, DEFAULT_JEV_MODEL);
const variants = [
	{ id: 'base', hyp: 'noise', repeats: 3, build: baseRequest, read: readNoul },
	{
		id: 'noAge',
		hyp: 'H2',
		build: (e) => {
			const r = baseRequest(e);
			return { ...r, state: withoutLine(r.state, 'Age:') };
		},
		read: readNoul
	},
	{
		id: 'noNote',
		hyp: 'H2',
		build: (e) => {
			const r = baseRequest(e);
			return { ...r, state: withoutLine(r.state, 'Analyst notes:') };
		},
		read: readNoul
	},
	{
		id: 'noAgeNote',
		hyp: 'H2',
		build: (e) => {
			const r = baseRequest(e);
			return { ...r, state: withoutLine(withoutLine(r.state, 'Age:'), 'Analyst notes:') };
		},
		read: readNoul
	},
	{
		id: 'scoped',
		hyp: 'H1',
		build: (e) => reworded(baseRequest(e), SCOPED),
		read: readNoul
	},
	{
		// SYNTHETIC: a made-up age, to test whether the missing age is what holds
		// the answer down. Never recorded or shown.
		id: 'synthAge',
		hyp: 'H1',
		build: (e) => {
			const r = baseRequest(e);
			return { ...r, state: r.state.replace('Age: not available', 'Age: 27') };
		},
		read: readNoul
	},
	{
		id: 'asChoice',
		hyp: 'H3',
		build: (e) => {
			const r = baseRequest(e);
			const { criteria } = r.questions[Q];
			return {
				...r,
				questions: {
					...r.questions,
					[Q]: { type: 'choice', instructions: r.questions[Q].instructions, criteria }
				}
			};
		},
		read: readChoiceTrue
	},
	{
		id: 'q2Only',
		hyp: 'H4',
		build: (e) => {
			const r = baseRequest(e);
			return { ...r, questions: { [Q]: r.questions[Q] } };
		},
		read: readNoul
	},
	{
		// SYNTHETIC negative control: strip the numeric evidence. Should fall.
		id: 'negStrip',
		hyp: 'control',
		build: (e) =>
			baseRequest({ ...e, seasonPA: null, split: null, rate: null, eligiblePositions: [] }),
		read: readNoul
	}
];

const provider = createHttpJevProvider({ apiKey });
const jobs = [];
for (const v of variants)
	for (let rep = 0; rep < (v.repeats ?? 1); rep += 1)
		for (const e of sample) jobs.push({ v, rep, e });

const results = [];
let next = 0;
async function worker() {
	while (next < jobs.length) {
		const { v, rep, e } = jobs[next];
		next += 1;
		let value = null;
		let error = null;
		try {
			const raw = await provider.send(v.build(e), new AbortController().signal);
			value = v.read(raw?.answers);
			if (value === null) error = 'unreadable answer';
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
		results.push({ variant: v.id, rep, player: e.name, value, error });
	}
}
await Promise.all(Array.from({ length: 4 }, worker));

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = (xs) => {
	if (xs.length < 2) return NaN;
	const m = mean(xs);
	return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const f = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : 'n/a');
const valuesOf = (variant, player) =>
	results
		.filter((r) => r.variant === variant && r.player === player && r.value !== null)
		.map((r) => r.value);
const players = sample.map((e) => e.name);
const fullEvidence = players.filter((p) => p !== 'Triston Casas');
const baseMean = (p) => mean(valuesOf('base', p));

// Noise: within-player sd over the three unchanged repeats; and how much of the
// base spread across players is player signal at all.
const withinSd = mean(players.map((p) => sd(valuesOf('base', p))).filter(Number.isFinite));
const betweenSd = sd(fullEvidence.map(baseMean));

const rows = variants.map((v) => {
	const deltas = fullEvidence
		.map((p) => {
			const xs = valuesOf(v.id, p);
			return xs.length ? mean(xs) - baseMean(p) : null;
		})
		.filter((d) => d !== null && Number.isFinite(d));
	const shift = mean(deltas);
	let reading = 'reference';
	if (v.id === 'negStrip') {
		reading =
			shift <= -0.2 && -shift > 2 * withinSd
				? 'control passes (fell ≥ 0.20: the question reacts to evidence)'
				: 'control FAILS (did not fall ≥ 0.20: the question ignores evidence)';
	} else if (v.id !== 'base') {
		if (Math.abs(shift) < 0.05) reading = 'rejected (|shift| < 0.05)';
		else if (shift >= 0.15 && shift > 2 * withinSd)
			reading = 'supported (shift ≥ +0.15 and > 2× noise)';
		else if (shift <= -0.15 && -shift > 2 * withinSd) reading = 'moved down (≤ −0.15)';
		else reading = 'inconclusive';
	}
	return {
		id: v.id,
		hyp: v.hyp,
		n: fullEvidence.map((p) => valuesOf(v.id, p).length).reduce((a, b) => a + b, 0),
		mean: mean(fullEvidence.map((p) => mean(valuesOf(v.id, p)))),
		shift,
		reading
	};
});
const failures = results.filter((r) => r.error);
const casas = (id) => f(mean(valuesOf(id, 'Triston Casas')), 2);

const lines = [
	`# Jev evidence_sufficient probe (${new Date().toISOString()})`,
	'',
	`Sample: ${fullEvidence.length} Wild Card players with complete evidence + Triston Casas (no PA, no splits). ` +
		`${results.length} calls, ${failures.length} failed. Model ${DEFAULT_JEV_MODEL}.`,
	'',
	`- Noise (mean within-player sd over 3 unchanged repeats): **${f(withinSd)}**`,
	`- Spread of base values across players (sd of per-player means): **${f(betweenSd)}** ` +
		`(player signal beyond noise ≈ ${f(Math.sqrt(Math.max(0, betweenSd ** 2 - withinSd ** 2 / 3)))})`,
	`- Base mean over full-evidence players: **${f(rows[0].mean)}**; Casas base: **${casas('base')}**`,
	'',
	'| variant | hypothesis | mean | shift vs base | Casas | reading |',
	'|---|---|---|---|---|---|',
	...rows.map(
		(r) =>
			`| ${r.id} | ${r.hyp} | ${f(r.mean)} | ${r.id === 'base' ? '—' : (r.shift >= 0 ? '+' : '') + f(r.shift)} | ${casas(r.id)} | ${r.reading} |`
	),
	'',
	'`negStrip` is a synthetic control and `synthAge` uses a made-up age; both exist only to test the question and are not classifications.',
	...(failures.length
		? [
				'',
				'Failures:',
				...failures.slice(0, 10).map((r) => `- ${r.variant} ${r.player}: ${r.error}`)
			]
		: [])
];
const report = lines.join('\n');

const dir = new URL('../../reports/jev-probe/', import.meta.url);
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(
	new URL(`probe-${stamp}.json`, dir),
	`${JSON.stringify({ results, rows, withinSd, betweenSd }, null, 2)}\n`
);
writeFileSync(new URL(`probe-${stamp}.md`, dir), `${report}\n`);
console.log(report);
if (failures.length > jobs.length * 0.1) process.exit(1);
