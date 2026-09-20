import {
	ResultSchema,
	canonicalize,
	computeInputDigest,
	parseBundle,
	validateBundle,
	type Bundle,
	type BundleValidationIssue,
	type CalculationResult
} from '../contracts';
import {
	PERSISTENCE_KIND,
	PERSISTENCE_VERSION,
	type ImportConflict,
	type ImportResult,
	type LoadedComparison,
	type PersistedRevision,
	type PersistenceRepositoryOptions,
	type PersistenceStorage,
	type ReplayCallback,
	type ReplayEntry,
	type ReplayOptions,
	type ReplayReport,
	type SaveResult,
	type StoredComparison
} from './types';
import { IndexedDbPersistenceStorage, type IndexedDbPersistenceStorageOptions } from './storage';

export class PersistenceImportError extends Error {
	readonly issues: BundleValidationIssue[];

	constructor(issues: BundleValidationIssue[]) {
		super(
			issues.map((issue) => `${issue.code} at ${issue.path || '/'}: ${issue.message}`).join('\n')
		);
		this.name = 'PersistenceImportError';
		this.issues = issues;
	}
}

export class PersistenceStorageError extends Error {
	override readonly cause?: unknown;

	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = 'PersistenceStorageError';
		this.cause = cause;
	}
}

export class PersistenceRevisionConflictError extends Error {
	readonly bundleId: string;
	readonly currentRevision: number;
	readonly incomingRevision: number;

	constructor(bundleId: string, currentRevision: number, incomingRevision: number) {
		super(
			`bundle '${bundleId}' must advance its comparison revision before saving ` +
				`(${incomingRevision} is not greater than ${currentRevision})`
		);
		this.name = 'PersistenceRevisionConflictError';
		this.bundleId = bundleId;
		this.currentRevision = currentRevision;
		this.incomingRevision = incomingRevision;
	}
}

export type ImportOptions = {
	replaceAsNewRevision?: boolean;
};

export type PersistenceRepositoryFactoryOptions = PersistenceRepositoryOptions & {
	storage?: PersistenceStorage;
	indexedDB?: IndexedDbPersistenceStorageOptions['indexedDB'];
	dbName?: string;
};

type DecodedImport = {
	record: StoredComparison;
	validationIssues: BundleValidationIssue[];
};

function clone<T>(value: T): T {
	return structuredClone(value);
}

function issue(
	code: string,
	path: string,
	message: string,
	playerIds: string[] = []
): BundleValidationIssue {
	return { code, path, message, playerIds };
}

function prefixIssue(prefix: string, candidate: BundleValidationIssue): BundleValidationIssue {
	return { ...candidate, path: `${prefix}${candidate.path}` };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
	const expected = new Set(keys);
	return (
		Object.keys(value).every((key) => expected.has(key)) &&
		expected.size === Object.keys(value).length
	);
}

function isSafePositiveInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function uniqueCalculationVersions(bundle: Bundle): string[] {
	return [...new Set(bundle.results.map(({ calculationVersion }) => calculationVersion))];
}

function currentRevision(record: StoredComparison): PersistedRevision {
	const current = record.revisions.find(
		({ storedRevision }) => storedRevision === record.currentStoredRevision
	);
	if (!current) throw new Error(`stored record '${record.bundleId}' has no current revision`);
	return current;
}

function makePersistedRevision(
	bundle: Bundle,
	storedRevision: number,
	savedAt: string
): PersistedRevision {
	return {
		storedRevision,
		savedAt,
		bundle: clone(bundle),
		inputDigest: computeInputDigest(bundle),
		calculationVersions: uniqueCalculationVersions(bundle)
	};
}

function makeRecord(revision: PersistedRevision): StoredComparison {
	return {
		persistenceVersion: PERSISTENCE_VERSION,
		kind: PERSISTENCE_KIND,
		bundleId: revision.bundle.bundleId,
		currentStoredRevision: revision.storedRevision,
		revisions: [revision]
	};
}

function sameBundle(left: Bundle, right: Bundle): boolean {
	return canonicalize(left) === canonicalize(right);
}

function sameRecord(left: StoredComparison, right: StoredComparison): boolean {
	return canonicalize(left) === canonicalize(right);
}

function normalizeRecord(record: StoredComparison): StoredComparison {
	return clone(record);
}

function validateRevisionEnvelope(
	value: unknown,
	path: string,
	validationIssues: BundleValidationIssue[]
): PersistedRevision | undefined {
	if (!isRecord(value)) {
		validationIssues.push(issue('INVALID_SCHEMA', path, 'revision must be an object'));
		return undefined;
	}
	if (
		!hasExactKeys(value, [
			'storedRevision',
			'savedAt',
			'bundle',
			'inputDigest',
			'calculationVersions'
		]) ||
		!isSafePositiveInteger(value.storedRevision) ||
		typeof value.savedAt !== 'string' ||
		!/Z$/.test(value.savedAt) ||
		Number.isNaN(Date.parse(value.savedAt)) ||
		typeof value.inputDigest !== 'string' ||
		!/^[0-9a-f]{64}$/.test(value.inputDigest) ||
		!Array.isArray(value.calculationVersions) ||
		!value.calculationVersions.every((version) => typeof version === 'string' && version.length > 0)
	) {
		validationIssues.push(issue('INVALID_SCHEMA', path, 'revision metadata is malformed'));
		return undefined;
	}

	const validation = validateBundle(value.bundle);
	if (!validation.success) {
		validationIssues.push(
			...validation.issues.map((candidate) => prefixIssue(`${path}/bundle`, candidate))
		);
		return undefined;
	}
	const bundle = parseBundle(validation.data);
	const calculatedDigest = computeInputDigest(bundle);
	if (calculatedDigest !== value.inputDigest) {
		validationIssues.push(
			issue(
				'INVALID_SCHEMA',
				`${path}/inputDigest`,
				'persisted input digest does not match the embedded bundle'
			)
		);
	}
	const versions = uniqueCalculationVersions(bundle);
	if (canonicalize(versions) !== canonicalize(value.calculationVersions)) {
		validationIssues.push(
			issue(
				'INVALID_SCHEMA',
				`${path}/calculationVersions`,
				'calculation versions do not match cached results'
			)
		);
	}
	const calculationVersions = Array.isArray(value.calculationVersions)
		? value.calculationVersions.filter((version): version is string => typeof version === 'string')
		: [];
	return {
		storedRevision: value.storedRevision,
		savedAt: value.savedAt,
		bundle,
		inputDigest: value.inputDigest,
		calculationVersions: [...calculationVersions]
	};
}

function decodeImport(input: unknown, savedAt: string): DecodedImport {
	let value: unknown = input;
	if (typeof input === 'string') {
		try {
			value = JSON.parse(input) as unknown;
		} catch (error) {
			throw new PersistenceImportError([
				issue(
					'INVALID_SCHEMA',
					'',
					`import is not valid JSON: ${error instanceof Error ? error.message : 'parse failed'}`
				)
			]);
		}
	}

	if (isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'persistenceVersion')) {
		const envelope = value;
		const issues: BundleValidationIssue[] = [];
		if (envelope.persistenceVersion !== PERSISTENCE_VERSION) {
			issues.push(
				issue(
					'UNSUPPORTED_VERSION',
					'/persistenceVersion',
					`unsupported persistence version '${String(envelope.persistenceVersion)}'`
				)
			);
		}
		if (
			!hasExactKeys(envelope, [
				'persistenceVersion',
				'kind',
				'bundleId',
				'currentStoredRevision',
				'revisions'
			]) ||
			envelope.kind !== PERSISTENCE_KIND ||
			typeof envelope.bundleId !== 'string' ||
			!isSafePositiveInteger(envelope.currentStoredRevision) ||
			!Array.isArray(envelope.revisions) ||
			envelope.revisions.length === 0
		) {
			issues.push(issue('INVALID_SCHEMA', '', 'persistence envelope is malformed'));
		}
		if (issues.length > 0) throw new PersistenceImportError(issues);
		const bundleId = envelope.bundleId as string;
		const currentStoredRevision = envelope.currentStoredRevision as number;
		const envelopeRevisions = envelope.revisions as unknown[];

		const revisions: PersistedRevision[] = [];
		for (const [index, candidate] of envelopeRevisions.entries()) {
			const revision = validateRevisionEnvelope(candidate, `/revisions/${index}`, issues);
			if (revision) revisions.push(revision);
		}
		const storedRevisions = new Set<number>();
		for (const [index, revision] of revisions.entries()) {
			if (storedRevisions.has(revision.storedRevision)) {
				issues.push(
					issue('DUPLICATE_ID', `/revisions/${index}/storedRevision`, 'stored revision is repeated')
				);
			}
			storedRevisions.add(revision.storedRevision);
			if (revision.bundle.bundleId !== bundleId) {
				issues.push(
					issue(
						'INVALID_SCHEMA',
						`/revisions/${index}/bundle/bundleId`,
						'bundle ID differs from envelope'
					)
				);
			}
		}
		const maxRevision = Math.max(...revisions.map(({ storedRevision }) => storedRevision));
		if (currentStoredRevision !== maxRevision) {
			issues.push(
				issue(
					'INVALID_SCHEMA',
					'/currentStoredRevision',
					'current stored revision must be the newest revision'
				)
			);
		}
		if (issues.length > 0) throw new PersistenceImportError(issues);
		return {
			record: {
				persistenceVersion: PERSISTENCE_VERSION,
				kind: PERSISTENCE_KIND,
				bundleId,
				currentStoredRevision,
				revisions
			},
			validationIssues: []
		};
	}

	const validation = validateBundle(value);
	if (!validation.success) throw new PersistenceImportError(validation.issues);
	const bundle = parseBundle(validation.data);
	return {
		record: makeRecord(makePersistedRevision(bundle, 1, savedAt)),
		validationIssues: validation.issues
	};
}

function mergeAsNewRevision(
	existing: StoredComparison,
	incoming: StoredComparison,
	savedAt: string
): StoredComparison {
	const revisions = existing.revisions.map(clone);
	let nextStoredRevision = Math.max(...revisions.map(({ storedRevision }) => storedRevision));
	const incomingRevisions = [...incoming.revisions].sort(
		(left, right) => left.storedRevision - right.storedRevision
	);
	for (const candidate of incomingRevisions) {
		if (revisions.some((current) => sameBundle(current.bundle, candidate.bundle))) continue;
		nextStoredRevision += 1;
		revisions.push({ ...clone(candidate), storedRevision: nextStoredRevision, savedAt });
	}
	if (revisions.length === existing.revisions.length) {
		const latest = currentRevision(incoming);
		nextStoredRevision += 1;
		revisions.push({ ...clone(latest), storedRevision: nextStoredRevision, savedAt });
	}
	return {
		persistenceVersion: PERSISTENCE_VERSION,
		kind: PERSISTENCE_KIND,
		bundleId: existing.bundleId,
		currentStoredRevision: nextStoredRevision,
		revisions
	};
}

function withReplayIssue(
	entries: ReplayEntry[],
	issues: BundleValidationIssue[],
	result: CalculationResult,
	status: ReplayEntry['status'],
	resultIndex: number,
	message?: string
): void {
	const replayIssue = message
		? issue('REPLAY_MISMATCH', `/results/${resultIndex}`, message)
		: undefined;
	entries.push({
		scenarioId: result.scenarioId,
		calculationVersion: result.calculationVersion,
		status,
		...(replayIssue ? { issue: replayIssue } : {})
	});
	if (replayIssue) issues.push(replayIssue);
}

async function inspectReplay(bundle: Bundle, options: ReplayOptions): Promise<ReplayReport> {
	if (bundle.results.length === 0) {
		return { status: 'unevaluated', entries: [], issues: [] };
	}

	const supported = options.supportedCalculationVersions
		? new Set(options.supportedCalculationVersions)
		: undefined;
	const entries: ReplayEntry[] = [];
	const issues: BundleValidationIssue[] = [];
	for (const [index, result] of bundle.results.entries()) {
		if (supported && !supported.has(result.calculationVersion)) {
			const replayIssue = issue(
				'REPLAY_UNAVAILABLE',
				`/results/${index}/calculationVersion`,
				`calculation version '${result.calculationVersion}' is unavailable for replay`
			);
			entries.push({
				scenarioId: result.scenarioId,
				calculationVersion: result.calculationVersion,
				status: 'unavailable',
				issue: replayIssue
			});
			issues.push(replayIssue);
			continue;
		}
		if (!options.replay) {
			entries.push({
				scenarioId: result.scenarioId,
				calculationVersion: result.calculationVersion,
				status: 'not-checked'
			});
			continue;
		}

		let replayed: CalculationResult | null | undefined;
		try {
			replayed = await options.replay({
				bundle,
				cachedResult: result,
				calculationVersion: result.calculationVersion,
				scenarioId: result.scenarioId,
				scenarioRevision: result.scenarioRevision
			});
		} catch (error) {
			const replayIssue = issue(
				'REPLAY_UNAVAILABLE',
				`/results/${index}/calculationVersion`,
				`replay failed: ${error instanceof Error ? error.message : 'unknown error'}`
			);
			entries.push({
				scenarioId: result.scenarioId,
				calculationVersion: result.calculationVersion,
				status: 'unavailable',
				issue: replayIssue
			});
			issues.push(replayIssue);
			continue;
		}
		if (!replayed) {
			const replayIssue = issue(
				'REPLAY_UNAVAILABLE',
				`/results/${index}/calculationVersion`,
				'replay callback does not provide this calculation version'
			);
			entries.push({
				scenarioId: result.scenarioId,
				calculationVersion: result.calculationVersion,
				status: 'unavailable',
				issue: replayIssue
			});
			issues.push(replayIssue);
			continue;
		}
		const parsed = ResultSchema.safeParse(replayed);
		if (!parsed.success || canonicalize(parsed.data) !== canonicalize(result)) {
			withReplayIssue(
				entries,
				issues,
				result,
				'mismatch',
				index,
				parsed.success
					? 'replayed result differs from the cached result'
					: 'replayed result is invalid'
			);
			continue;
		}
		entries.push({
			scenarioId: result.scenarioId,
			calculationVersion: result.calculationVersion,
			status: 'verified'
		});
	}

	const hasMismatch = entries.some(({ status }) => status === 'mismatch');
	const hasHistorical = entries.some(({ status }) => status === 'unavailable');
	const hasUnverified = entries.some(({ status }) => status === 'not-checked');
	return {
		status: hasMismatch
			? 'replay-mismatch'
			: hasHistorical
				? 'historical'
				: hasUnverified
					? 'not-checked'
					: 'verified',
		entries,
		issues
	};
}

export class PersistenceRepository {
	private readonly storage: PersistenceStorage;
	private readonly replayOptions: ReplayOptions;
	private readonly clock: () => string;

	constructor(storage: PersistenceStorage, options: PersistenceRepositoryOptions = {}) {
		this.storage = storage;
		this.replayOptions = options;
		this.clock = options.clock ?? (() => new Date().toISOString());
	}

	private async read(bundleId: string): Promise<StoredComparison | undefined> {
		try {
			return await this.storage.get(bundleId);
		} catch (error) {
			throw new PersistenceStorageError(`could not read bundle '${bundleId}'`, error);
		}
	}

	private async write(record: StoredComparison): Promise<void> {
		try {
			await this.storage.put(clone(record));
		} catch (error) {
			throw new PersistenceStorageError(`could not save bundle '${record.bundleId}'`, error);
		}
	}

	private parseBundle(input: unknown): {
		bundle: Bundle;
		validationIssues: BundleValidationIssue[];
	} {
		const validation = validateBundle(input);
		if (!validation.success) throw new PersistenceImportError(validation.issues);
		return { bundle: parseBundle(validation.data), validationIssues: validation.issues };
	}

	private async view(
		record: StoredComparison,
		validationIssues: BundleValidationIssue[] = []
	): Promise<LoadedComparison> {
		const current = currentRevision(record);
		return {
			record: normalizeRecord(record),
			current: clone(current),
			validationIssues: [...validationIssues],
			replay: await inspectReplay(current.bundle, this.replayOptions)
		};
	}

	async save(input: Bundle): Promise<SaveResult> {
		const { bundle, validationIssues } = this.parseBundle(input);
		const existing = await this.read(bundle.bundleId);
		const now = this.clock();
		if (!existing) {
			const record = makeRecord(makePersistedRevision(bundle, 1, now));
			await this.write(record);
			return { ...(await this.view(record, validationIssues)), status: 'saved' };
		}

		const current = currentRevision(existing);
		const sameInputs = current.inputDigest === computeInputDigest(bundle);
		const sameDomainRevision = current.bundle.comparison.revision === bundle.comparison.revision;
		let nextRecord: StoredComparison;
		let status: SaveResult['status'];
		if (sameBundle(current.bundle, bundle)) {
			nextRecord = existing;
			status = 'updated';
		} else if (sameInputs && sameDomainRevision) {
			const updated = makePersistedRevision(bundle, current.storedRevision, now);
			nextRecord = {
				...existing,
				revisions: existing.revisions.map((revision) =>
					revision.storedRevision === current.storedRevision ? updated : revision
				)
			};
			status = 'updated';
		} else {
			if (bundle.comparison.revision <= current.bundle.comparison.revision) {
				throw new PersistenceRevisionConflictError(
					bundle.bundleId,
					current.bundle.comparison.revision,
					bundle.comparison.revision
				);
			}
			const updated = makePersistedRevision(
				bundle,
				Math.max(...existing.revisions.map(({ storedRevision }) => storedRevision)) + 1,
				now
			);
			nextRecord = {
				...existing,
				currentStoredRevision: updated.storedRevision,
				revisions: [...existing.revisions.map(clone), updated]
			};
			status = 'saved';
		}
		await this.write(nextRecord);
		return { ...(await this.view(nextRecord, validationIssues)), status };
	}

	async load(bundleId: string): Promise<LoadedComparison | null> {
		const record = await this.read(bundleId);
		return record ? this.view(record) : null;
	}

	async list(): Promise<StoredComparison[]> {
		try {
			return (await this.storage.list()).map(clone);
		} catch (error) {
			throw new PersistenceStorageError('could not list saved comparisons', error);
		}
	}

	async exportJson(bundleId: string): Promise<string> {
		const record = await this.read(bundleId);
		if (!record) throw new Error(`bundle '${bundleId}' was not found`);
		return JSON.stringify(record, null, 2);
	}

	async exportBundleJson(bundleId: string): Promise<string> {
		const record = await this.read(bundleId);
		if (!record) throw new Error(`bundle '${bundleId}' was not found`);
		return JSON.stringify(currentRevision(record).bundle, null, 2);
	}

	async importJson(input: string, options: ImportOptions = {}): Promise<ImportResult> {
		const decoded = decodeImport(input, this.clock());
		return this.importRecord(decoded, options);
	}

	async importBundle(input: unknown, options: ImportOptions = {}): Promise<ImportResult> {
		const parsed = this.parseBundle(input);
		const record = makeRecord(makePersistedRevision(parsed.bundle, 1, this.clock()));
		return this.importRecord({ record, validationIssues: parsed.validationIssues }, options);
	}

	private async importRecord(
		decoded: DecodedImport,
		options: ImportOptions
	): Promise<ImportResult> {
		const incoming = normalizeRecord(decoded.record);
		const existing = await this.read(incoming.bundleId);
		if (!existing) {
			await this.write(incoming);
			return {
				...(await this.view(incoming, decoded.validationIssues)),
				status: 'imported'
			};
		}
		if (sameRecord(existing, incoming)) {
			return {
				...(await this.view(existing, decoded.validationIssues)),
				status: 'unchanged'
			};
		}
		if (!options.replaceAsNewRevision) {
			const conflict: ImportConflict = {
				status: 'conflict',
				reason: 'duplicate-bundle-id',
				bundleId: incoming.bundleId,
				existing: normalizeRecord(existing),
				incoming
			};
			return conflict;
		}

		const replaced = mergeAsNewRevision(existing, incoming, this.clock());
		await this.write(replaced);
		return {
			...(await this.view(replaced, decoded.validationIssues)),
			status: 'replaced-as-new-revision'
		};
	}
}

export function createPersistenceRepository(
	options: PersistenceRepositoryFactoryOptions = {}
): PersistenceRepository {
	const storage =
		options.storage ??
		new IndexedDbPersistenceStorage({ dbName: options.dbName, indexedDB: options.indexedDB });
	return new PersistenceRepository(storage, options);
}

export function createMemoryPersistenceRepository(
	storage: PersistenceStorage,
	options: PersistenceRepositoryOptions = {}
): PersistenceRepository {
	return new PersistenceRepository(storage, options);
}

export type { ReplayCallback };
