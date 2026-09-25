import { describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_JEV_MODEL,
	JEV_ENDPOINT,
	JEV_PRICE_TABLE,
	JEV_RUBRIC_VERSION,
	JevRequestError,
	PROFILE_LABELS,
	PROMPT_VERSION,
	buildProfileRequest,
	classifyProfile,
	clearClassificationCache,
	createHttpJevProvider,
	estimateCostUsd,
	validateJevResponse,
	type JevProvider,
	type ProfileEvidence
} from '../../src/lib/classification';

// D-47: a live call behind a provider interface, validated and cached, with no
// invented confidence threshold. Nothing here touches the network: the HTTP
// provider is exercised through an injected fetch, and the service through a
// fake provider.
const EVIDENCE: ProfileEvidence = {
	playerId: 'mlbam-643396',
	name: 'Isiah Kiner-Falefa',
	bats: 'R',
	eligiblePositions: ['2B', 'SS'],
	age: 31,
	rate: '0.098039',
	rateLabel: 'Observed runs per PA (2025 season)',
	seasonPA: 176,
	split: {
		vsLeft: { pa: 54, ops: '0.417' },
		vsRight: { pa: 122, ops: '0.708' }
	},
	notes: 'Plays right-handed pitching well, so he needs a partner to fill a slot.'
};

function choiceResponse(overrides: Record<string, unknown> = {}) {
	const probabilities: Record<string, number> = {};
	PROFILE_LABELS.forEach((label, index) => {
		probabilities[label] = index === 0 ? 1 : 0;
	});
	return {
		model: 'jev-1.13.0',
		answers: {
			profile: { type: 'choice', choice: 'Star', probabilities, confidence: 1 },
			evidence_sufficient: { type: 'noul', noul: 0.9 }
		},
		usage: { input_tokens: 1000, output_tokens: 40 },
		...overrides
	};
}

/** A distribution over the rubric's options that does not add up. */
function shortDistribution(): Record<string, number> {
	return Object.fromEntries(
		PROFILE_LABELS.map((label, index) => [label, index === 0 ? 0.8 : 0.05])
	);
}

function fakeProvider(respond: () => unknown, id = 'test:jev-fake'): JevProvider {
	return { id, send: () => Promise.resolve(respond()) };
}

describe('classification prompt', () => {
	it('supplies every field the rubric rules need and states the ones it does not have', () => {
		const state = buildProfileRequest(EVIDENCE, DEFAULT_JEV_MODEL).state;
		expect(state).toContain('Player: Isiah Kiner-Falefa (mlbam-643396)');
		expect(state).toContain('Eligible fielding positions: 2B, SS');
		expect(state).toContain('Against left-handed pitching: 0.417 OPS over 54 PA');
		expect(state).toContain(`Rubric: ${JEV_RUBRIC_VERSION}`);

		const missing = buildProfileRequest(
			{ ...EVIDENCE, eligiblePositions: [], rate: null, split: null, seasonPA: null, age: null },
			DEFAULT_JEV_MODEL
		).state;
		expect(missing).toContain('Eligible fielding positions: none');
		expect(missing).toContain('Observed runs per PA (2025 season): not available');
		expect(missing).toContain('Season plate appearances: not available');
	});

	it('asks one closed-set profile question and one abstention question, and forbids arithmetic', () => {
		const request = buildProfileRequest(EVIDENCE, DEFAULT_JEV_MODEL);
		expect(Object.keys(request.questions).sort()).toEqual(['evidence_sufficient', 'profile']);
		const profile = request.questions.profile!;
		expect(profile.type).toBe('choice');
		expect(Object.keys(profile.criteria ?? {}).sort()).toEqual([...PROFILE_LABELS].sort());
		expect(profile.instructions).toMatch(/do not estimate/i);
		expect(request.questions.evidence_sufficient!.type).toBe('noul');
		expect(request.model).toBe(DEFAULT_JEV_MODEL);
	});

	it('builds the same request bytes for the same evidence and a different one when evidence moves', () => {
		const first = buildProfileRequest(EVIDENCE, DEFAULT_JEV_MODEL);
		const same = buildProfileRequest({ ...EVIDENCE }, DEFAULT_JEV_MODEL);
		const moved = buildProfileRequest({ ...EVIDENCE, rate: '0.128028' }, DEFAULT_JEV_MODEL);
		expect(JSON.stringify(first)).toBe(JSON.stringify(same));
		expect(JSON.stringify(first)).not.toBe(JSON.stringify(moved));
	});
});

describe('classification response contract', () => {
	const request = buildProfileRequest(EVIDENCE, DEFAULT_JEV_MODEL);

	it('accepts a documented response and reads both answers', () => {
		const result = validateJevResponse(choiceResponse(), request);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.model).toBe('jev-1.13.0');
		expect(result.data.usage).toEqual({ input_tokens: 1000, output_tokens: 40 });
	});

	it('rejects an answer type that does not match the question', () => {
		const result = validateJevResponse(
			choiceResponse({
				answers: {
					profile: { type: 'noul', noul: 0.5 },
					evidence_sufficient: { type: 'noul', noul: 0.9 }
				}
			}),
			request
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map(({ code }) => code)).toContain('ANSWER_TYPE_MISMATCH');
	});

	it('rejects a label outside the rubric and a distribution missing options', () => {
		const result = validateJevResponse(
			choiceResponse({
				answers: {
					profile: {
						type: 'choice',
						choice: 'Trapezoid',
						probabilities: { Star: 1 },
						confidence: 1
					},
					evidence_sufficient: { type: 'noul', noul: 0.9 }
				}
			}),
			request
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		const codes = result.issues.map(({ code }) => code);
		expect(codes).toContain('UNKNOWN_CHOICE');
		expect(codes).toContain('MISSING_PROBABILITY');
	});

	it('rejects a distribution that does not add up', () => {
		const result = validateJevResponse(
			choiceResponse({
				answers: {
					profile: {
						type: 'choice',
						choice: 'Star',
						probabilities: shortDistribution(),
						confidence: 0.6
					},
					evidence_sufficient: { type: 'noul', noul: 0.9 }
				}
			}),
			request
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map(({ code }) => code)).toEqual(['PROBABILITIES_NOT_NORMALIZED']);
	});

	it('rejects a body that is not the documented shape at all', () => {
		const result = validateJevResponse({ answers: 'nope' }, request);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.every(({ code }) => code === 'INVALID_RESPONSE')).toBe(true);
		expect(result.issues.every(({ path }) => path === '' || path.startsWith('/'))).toBe(true);
	});

	it('rejects a response that omits a question it was asked', () => {
		const result = validateJevResponse(
			choiceResponse({
				answers: {
					profile: {
						type: 'choice',
						choice: 'Star',
						probabilities: Object.fromEntries(
							PROFILE_LABELS.map((label, index) => [label, index === 0 ? 1 : 0])
						),
						confidence: 1
					}
				}
			}),
			request
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues).toEqual([
			{
				code: 'MISSING_ANSWER',
				path: '/answers/evidence_sufficient',
				message: "the provider returned no answer for question 'evidence_sufficient'"
			}
		]);
	});
});

describe('classification service', () => {
	it('does not send anything and says so when no key is configured', async () => {
		clearClassificationCache();
		const record = await classifyProfile(EVIDENCE, { provider: null, acknowledged: true });
		expect(record.status).toBe('not-configured');
		expect(record.issues[0]?.code).toBe('PROVIDER_NOT_CONFIGURED');
		expect(record.response).toBeNull();
		expect(record.answer).toBeNull();
		// The prompt is still inspectable, so the page can show what would be sent.
		expect(record.request.state).toContain('Isiah Kiner-Falefa');
	});

	it('waits for an explicit acknowledgment before calling out', async () => {
		clearClassificationCache();
		const send = vi.fn(() => Promise.resolve(choiceResponse()));
		const record = await classifyProfile(EVIDENCE, {
			provider: { id: 'test:jev-fake', send },
			acknowledged: false
		});
		expect(send).not.toHaveBeenCalled();
		expect(record.status).toBe('awaiting-acknowledgment');
		expect(record.issues[0]?.code).toBe('EXTERNAL_PROCESSING_NOT_ACKNOWLEDGED');
	});

	it('records model identity, usage, timing, and the answer for a good response', async () => {
		clearClassificationCache();
		let clock = 1000;
		const record = await classifyProfile(EVIDENCE, {
			provider: fakeProvider(() => choiceResponse()),
			acknowledged: true,
			now: () => (clock += 25)
		});
		expect(record.status).toBe('current');
		expect(record.model).toBe('jev-1.13.0');
		expect(record.providerId).toBe('test:jev-fake');
		expect(record.requestedModel).toBe(DEFAULT_JEV_MODEL);
		expect(record.rubricVersion).toBe(JEV_RUBRIC_VERSION);
		expect(record.promptVersion).toBe(PROMPT_VERSION);
		expect(record.usage).toEqual({
			inputTokens: 1000,
			outputTokens: 40,
			// 1000 input tokens at the published $0.042 / MTok.
			estimatedCostUsd: '0.000042'
		});
		expect(record.timingMs).toBe(25);
		expect(record.answer?.label).toBe('Star');
		expect(record.answer?.evidenceSufficient).toBe(0.9);
		// No threshold is applied anywhere: the abstention answer is reported raw.
		expect(record.answer).not.toHaveProperty('advisory');
	});

	it('caches by exact request, rubric, and provider, and re-asks when evidence moves', async () => {
		clearClassificationCache();
		const send = vi.fn(() => Promise.resolve(choiceResponse()));
		const provider: JevProvider = { id: 'test:jev-fake', send };
		await classifyProfile(EVIDENCE, { provider, acknowledged: true });
		await classifyProfile({ ...EVIDENCE }, { provider, acknowledged: true });
		expect(send).toHaveBeenCalledTimes(1);
		await classifyProfile({ ...EVIDENCE, rate: '0.128028' }, { provider, acknowledged: true });
		expect(send).toHaveBeenCalledTimes(2);
	});

	it('keeps a valid calculation usable when the response is invalid', async () => {
		clearClassificationCache();
		const record = await classifyProfile(EVIDENCE, {
			provider: fakeProvider(() => ({ model: 'jev-1.13.0', answers: {}, usage: {} })),
			acknowledged: true
		});
		expect(record.status).toBe('invalid-response');
		expect(record.answer).toBeNull();
		expect(record.issues.length).toBeGreaterThan(0);
	});

	it('maps a timeout to its own status and keeps the reason', async () => {
		clearClassificationCache();
		const record = await classifyProfile(EVIDENCE, {
			provider: {
				id: 'test:jev-fake',
				send: () => Promise.reject(new JevRequestError('timeout', 'no response within 20000ms'))
			},
			acknowledged: true
		});
		expect(record.status).toBe('timeout');
		expect(record.issues[0]).toEqual({
			code: 'TIMEOUT',
			path: '',
			message: 'no response within 20000ms'
		});
	});

	it('estimates cost from the published list price and labels it an estimate', () => {
		expect(estimateCostUsd(1000, 0)).toBe('0.000042');
		expect(estimateCostUsd(0, 10_000)).toBe('0.000000');
		expect(JEV_PRICE_TABLE.source).toMatch(/TypeSafe/);
	});
});

describe('http provider', () => {
	it('posts the documented request and returns the parsed body', async () => {
		clearClassificationCache();
		let sentUrl = '';
		let sentInit: RequestInit | undefined;
		const provider = createHttpJevProvider({
			apiKey: 'test-key',
			fetchImpl: (url, init) => {
				sentUrl = url instanceof Request ? url.url : url.toString();
				sentInit = init;
				return Promise.resolve(
					new Response(JSON.stringify(choiceResponse()), {
						status: 200,
						headers: { 'content-type': 'application/json' }
					})
				);
			}
		});
		const record = await classifyProfile(EVIDENCE, { provider, acknowledged: true });

		expect(sentUrl).toBe(JEV_ENDPOINT);
		expect(sentInit?.method).toBe('POST');
		expect(new Headers(sentInit?.headers).get('Authorization')).toBe('Bearer test-key');
		const body = JSON.parse(typeof sentInit?.body === 'string' ? sentInit.body : '{}') as {
			model: string;
			questions: Record<string, { criteria?: Record<string, string> }>;
		};
		expect(body.model).toBe(DEFAULT_JEV_MODEL);
		expect(Object.keys(body.questions.profile?.criteria ?? {})).toContain('Star');
		expect(record.status).toBe('current');
	});

	it('retries a documented retryable status and then surfaces it', async () => {
		clearClassificationCache();
		let calls = 0;
		const provider = createHttpJevProvider({
			apiKey: 'test-key',
			fetchImpl: () => {
				calls += 1;
				return Promise.resolve(new Response('overloaded', { status: 529 }));
			},
			sleep: () => Promise.resolve()
		});
		const record = await classifyProfile(EVIDENCE, { provider, acknowledged: true });

		expect(calls).toBe(3);
		expect(record.status).toBe('error');
		expect(record.issues[0]?.code).toBe('OVERLOADED');
	});

	it('does not retry a rejected key', async () => {
		clearClassificationCache();
		let calls = 0;
		const provider = createHttpJevProvider({
			apiKey: 'wrong',
			fetchImpl: () => {
				calls += 1;
				return Promise.resolve(new Response('bad key', { status: 401 }));
			},
			sleep: () => Promise.resolve()
		});
		const record = await classifyProfile(EVIDENCE, { provider, acknowledged: true });

		expect(calls).toBe(1);
		expect(record.issues[0]?.code).toBe('UNAUTHORIZED');
	});

	it('times out instead of waiting forever', async () => {
		clearClassificationCache();
		const provider = createHttpJevProvider({
			apiKey: 'test-key',
			timeoutMs: 5,
			fetchImpl: (_url, init) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => {
						const error = new Error('aborted');
						error.name = 'AbortError';
						reject(error);
					});
				})
		});
		const record = await classifyProfile(EVIDENCE, { provider, acknowledged: true });

		expect(record.status).toBe('timeout');
		expect(record.issues[0]?.code).toBe('TIMEOUT');
	});
});
