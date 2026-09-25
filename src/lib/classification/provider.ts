// The provider boundary: one narrow call, no app state (D-47, SPEC §7). The
// HTTP provider speaks the documented TypeSafe contract
// (POST https://api.typesafe.ai/v1/systemone, Bearer auth) and turns transport
// outcomes into typed failures, so a timeout, a rejected body, and an
// overloaded service are three different things the UI can say out loud.
import type { JevSystemOneRequest } from './prompt';

export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const DEFAULT_JEV_MODEL = 'jev-latest';

export type JevFailureKind =
	| 'timeout'
	| 'unauthorized'
	| 'rate-limited'
	| 'overloaded'
	| 'rejected'
	| 'network'
	| 'unreadable';

export class JevRequestError extends Error {
	readonly kind: JevFailureKind;
	readonly status: number | null;
	readonly detail: string | null;

	constructor(
		kind: JevFailureKind,
		message: string,
		status: number | null = null,
		detail: string | null = null
	) {
		super(message);
		this.name = 'JevRequestError';
		this.kind = kind;
		this.status = status;
		this.detail = detail;
	}
}

export interface JevProvider {
	readonly id: string;
	send(request: JevSystemOneRequest, signal: AbortSignal): Promise<unknown>;
}

export interface HttpJevProviderOptions {
	apiKey: string;
	model?: string;
	endpoint?: string;
	timeoutMs?: number;
	/** Retries for the two documented retryable statuses, with a fixed backoff. */
	retries?: number;
	retryDelayMs?: number;
	fetchImpl?: typeof fetch;
	sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

/** Map an HTTP status to the failure the UI should describe. */
function failureForStatus(status: number): JevFailureKind {
	if (status === 401 || status === 403) return 'unauthorized';
	if (status === 429) return 'rate-limited';
	if (status === 529) return 'overloaded';
	return 'rejected';
}

const RETRYABLE: ReadonlySet<JevFailureKind> = new Set(['rate-limited', 'overloaded']);

/**
 * One request per call, with a hard timeout. The key is read from the caller's
 * session and never stored here: this object holds no state beyond the options
 * it was constructed with.
 */
export function createHttpJevProvider(options: HttpJevProviderOptions): JevProvider {
	const {
		apiKey,
		model = DEFAULT_JEV_MODEL,
		endpoint = JEV_ENDPOINT,
		timeoutMs = 20_000,
		retries = 2,
		retryDelayMs = 750,
		fetchImpl = fetch,
		sleep = defaultSleep
	} = options;
	return {
		id: `typesafe:${model}`,
		async send(request, signal) {
			let attempt = 0;
			for (;;) {
				const controller = new AbortController();
				const onAbort = () => controller.abort(signal.reason);
				signal.addEventListener('abort', onAbort, { once: true });
				const timer = setTimeout(() => controller.abort(new Error('jev timeout')), timeoutMs);
				try {
					const response = await fetchImpl(endpoint, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${apiKey}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ ...request, model: request.model || model }),
						signal: controller.signal
					});
					if (!response.ok) {
						const detail = (await response.text().catch(() => '')).slice(0, 400) || null;
						const kind = failureForStatus(response.status);
						if (RETRYABLE.has(kind) && attempt < retries) {
							attempt += 1;
							await sleep(retryDelayMs * attempt);
							continue;
						}
						throw new JevRequestError(
							kind,
							`the provider returned HTTP ${response.status}`,
							response.status,
							detail
						);
					}
					return (await response.json()) as unknown;
				} catch (error) {
					if (error instanceof JevRequestError) throw error;
					if (signal.aborted) {
						throw new JevRequestError('timeout', 'the classification request was cancelled');
					}
					if (error instanceof Error && error.name === 'AbortError') {
						throw new JevRequestError('timeout', `no response within ${timeoutMs}ms`);
					}
					throw new JevRequestError(
						'network',
						error instanceof Error ? error.message : 'the request failed'
					);
				} finally {
					clearTimeout(timer);
					signal.removeEventListener('abort', onAbort);
				}
			}
		}
	};
}
