// The classification service: prompt in, validated record out (D-47). It runs
// only when a person asks for it, caches by request digest + rubric + prompt,
// records model identity, usage, timing, and status, and never throws into the
// calculation path. A failure here leaves every quantitative result untouched
// (ACCEPTANCE I-10).
//
// No confidence threshold is applied anywhere in this component. SPEC §7 does not
// adopt the original 0.80 / 0.65 cutoffs, O-07 has not set tolerable error, and
// a threshold chosen here would be an invented one: the numbers are reported as
// model estimates and the reader decides what to do with them.
import { canonicalize } from '../contracts';
import {
	PROMPT_VERSION,
	buildProfileRequest,
	type JevSystemOneRequest,
	type ProfileEvidence
} from './prompt';
import { DEFAULT_JEV_MODEL, JevRequestError, type JevProvider } from './provider';
import { JEV_RUBRIC_VERSION, type ProfileLabel } from './rubric';
import {
	RESPONSE_CONTRACT_VERSION,
	readProfileAnswers,
	validateJevResponse,
	type JevIssue,
	type JevResponse
} from './schema';

export const CLASSIFICATION_VERSION = 'jev-classification-v1';

/**
 * Vendor-reported list price (TypeSafe launch post, 2026-09-15): input tokens
 * are billed, output tokens are not. It is a published rate, not a quote for
 * this account, so every cost here is an estimate and is labeled as one.
 */
export const JEV_PRICE_TABLE = {
	source: 'TypeSafe launch post, 2026-09-15',
	inputUsdPerMillionTokens: 0.042,
	outputUsdPerMillionTokens: 0
} as const;

export type JevStatus =
	| 'not-configured'
	| 'awaiting-acknowledgment'
	| 'pending'
	| 'current'
	| 'invalid-response'
	| 'timeout'
	| 'error'
	| 'overridden';

export interface JevUsage {
	inputTokens: number;
	outputTokens: number;
	/** Estimated cost in USD, six decimals, from the published list price. */
	estimatedCostUsd: string;
}

export interface JevAnswer {
	/** The rubric's top option. Advisory only: never a calculation input. */
	label: ProfileLabel;
	/** The full distribution over the rubric's options. */
	probabilities: Record<string, number>;
	/** TypeSafe's derived confidence for the distribution's shape. */
	confidence: number;
	/** The abstention question: is the evidence enough to label at all? */
	evidenceSufficient: number;
}

export interface JevRecord {
	classificationVersion: typeof CLASSIFICATION_VERSION;
	promptVersion: typeof PROMPT_VERSION;
	rubricVersion: typeof JEV_RUBRIC_VERSION;
	responseContractVersion: typeof RESPONSE_CONTRACT_VERSION;
	/** Cache key material: canonical digest of the exact request body. */
	requestDigest: string;
	providerId: string | null;
	/** The model asked for, and the model version that answered. */
	requestedModel: string;
	model: string | null;
	/** The request as it would be sent, so the prompt is inspectable. */
	request: JevSystemOneRequest;
	response: JevResponse | null;
	status: JevStatus;
	issues: JevIssue[];
	usage: JevUsage | null;
	timingMs: number | null;
	answer: JevAnswer | null;
	/** A human label kept beside the model's, with its reason. */
	override: { label: ProfileLabel; reason: string; by: string } | null;
}

export interface ClassificationOptions {
	/** null when no key is configured for this session. */
	provider: JevProvider | null;
	/** Explicit permission to send this evidence to an external provider. */
	acknowledged: boolean;
	model?: string;
	now?: () => number;
}

const COST_PRECISION = 6;

/** Six-decimal USD estimate from the published list price. */
export function estimateCostUsd(inputTokens: number, outputTokens: number): string {
	const usd =
		(inputTokens * JEV_PRICE_TABLE.inputUsdPerMillionTokens +
			outputTokens * JEV_PRICE_TABLE.outputUsdPerMillionTokens) /
		1_000_000;
	return usd.toFixed(COST_PRECISION);
}

/** Canonical digest of a request; the same canonical JSON the contract uses. */
export function requestDigest(request: JevSystemOneRequest): string {
	return canonicalize(request);
}

function answerFor(response: JevResponse): JevAnswer | null {
	const read = readProfileAnswers(response);
	if (!read) return null;
	return {
		label: read.choice,
		probabilities: read.probabilities,
		confidence: read.confidence,
		evidenceSufficient: read.evidenceSufficient
	};
}

function baseRecord(
	request: JevSystemOneRequest,
	digest: string,
	status: JevStatus,
	issues: JevIssue[] = []
): JevRecord {
	return {
		classificationVersion: CLASSIFICATION_VERSION,
		promptVersion: PROMPT_VERSION,
		rubricVersion: JEV_RUBRIC_VERSION,
		responseContractVersion: RESPONSE_CONTRACT_VERSION,
		requestDigest: digest,
		providerId: null,
		requestedModel: request.model,
		model: null,
		request,
		response: null,
		status,
		issues,
		usage: null,
		timingMs: null,
		answer: null,
		override: null
	};
}

/** Cache by provider, rubric, prompt, and exact request, so any change re-asks. */
const cache = new Map<string, JevRecord>();
const cacheKey = (providerId: string, digest: string) =>
	`${providerId}|${JEV_RUBRIC_VERSION}|${PROMPT_VERSION}|${digest}`;

/**
 * Classify one player's profile through the provider, or explain why it could
 * not. The returned record is always complete: there is no failure that leaves
 * the caller without a status and a reason.
 */
export async function classifyProfile(
	evidence: ProfileEvidence,
	options: ClassificationOptions
): Promise<JevRecord> {
	const now = options.now ?? (() => Date.now());
	const requestedModel = options.model ?? DEFAULT_JEV_MODEL;
	const request = buildProfileRequest(evidence, requestedModel);
	const digest = requestDigest(request);

	if (!options.provider) {
		return baseRecord(request, digest, 'not-configured', [
			{
				code: 'PROVIDER_NOT_CONFIGURED',
				path: '',
				message: 'no provider key is configured for this session, so nothing was sent'
			}
		]);
	}
	const providerId = options.provider.id;
	const cached = cache.get(cacheKey(providerId, digest));
	if (cached) return cached;
	if (!options.acknowledged) {
		return baseRecord(request, digest, 'awaiting-acknowledgment', [
			{
				code: 'EXTERNAL_PROCESSING_NOT_ACKNOWLEDGED',
				path: '',
				message:
					"sending this player's observations to an external provider has not been acknowledged"
			}
		]);
	}

	const started = now();
	try {
		const raw = await options.provider.send(request, new AbortController().signal);
		const validation = validateJevResponse(raw, request);
		if (!validation.success) {
			return {
				...baseRecord(request, digest, 'invalid-response', validation.issues),
				providerId,
				timingMs: now() - started
			};
		}
		const { data } = validation;
		const record: JevRecord = {
			...baseRecord(request, digest, 'current'),
			providerId,
			model: data.model,
			response: data,
			usage: {
				inputTokens: data.usage.input_tokens,
				outputTokens: data.usage.output_tokens,
				estimatedCostUsd: estimateCostUsd(data.usage.input_tokens, data.usage.output_tokens)
			},
			timingMs: now() - started,
			answer: answerFor(data)
		};
		cache.set(cacheKey(providerId, digest), record);
		return record;
	} catch (error) {
		const failure = error instanceof JevRequestError ? error : null;
		return {
			...baseRecord(request, digest, failure?.kind === 'timeout' ? 'timeout' : 'error', [
				{
					code: failure ? failure.kind.toUpperCase() : 'REQUEST_FAILED',
					path: '',
					message: failure
						? [failure.message, failure.detail].filter(Boolean).join(': ')
						: 'the classification request failed'
				}
			]),
			providerId,
			timingMs: now() - started
		};
	}
}

/** Records cached this session, in call order. */
export function classificationCacheEntries(): readonly JevRecord[] {
	return [...cache.values()];
}

/** Forget every cached classification for this session. */
export function clearClassificationCache(): void {
	cache.clear();
}
